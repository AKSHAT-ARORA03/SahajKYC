import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { redis } from '../../lib/redis.js';
import { AuditLog } from '../models/index.js';

/**
 * Comprehensive Notification Service for SAHAJ KYC
 * Handles SMS, Email, and In-App notifications with multi-language support
 */
export class NotificationService {
  static CACHE_PREFIX = 'notification:';
  static CACHE_TTL = 3600; // 1 hour

  // Initialize notification providers
  static emailTransporter = process.env.SMTP_HOST ? nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  }) : null;

  static twilioClient = process.env.TWILIO_ACCOUNT_SID ? 
    twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

  /**
   * Send KYC initiation notification
   */
  static async sendKycInitiated(userId, applicationId) {
    const notification = {
      type: 'kyc_initiated',
      userId,
      applicationId,
      title: 'KYC Application Started',
      message: 'Your KYC application has been successfully initiated. Complete all steps to verify your identity.',
      priority: 'normal',
      channels: ['in_app', 'email']
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send document acceptance notification
   */
  static async sendDocumentsAccepted(userId, applicationId) {
    const notification = {
      type: 'documents_accepted',
      userId,
      applicationId,
      title: 'Documents Verified',
      message: 'Your submitted documents have been successfully verified. Proceed to face verification.',
      priority: 'normal',
      channels: ['in_app', 'push']
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send document rejection notification
   */
  static async sendDocumentsRejected(userId, applicationId, documentResults) {
    const rejectedDocs = documentResults.filter(doc => !doc.success);
    const rejectedTypes = rejectedDocs.map(doc => doc.documentType).join(', ');

    const notification = {
      type: 'documents_rejected',
      userId,
      applicationId,
      title: 'Documents Need Attention',
      message: `Some documents were rejected: ${rejectedTypes}. Please resubmit with better quality images.`,
      priority: 'high',
      channels: ['in_app', 'email', 'sms'],
      actionRequired: true,
      actionUrl: `/kyc/${applicationId}/documents`
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send face verification success notification
   */
  static async sendFaceVerificationSuccess(userId, applicationId) {
    const notification = {
      type: 'face_verification_success',
      userId,
      applicationId,
      title: 'Face Verification Complete',
      message: 'Face verification successful! Proceed to DigiLocker verification for faster processing.',
      priority: 'normal',
      channels: ['in_app', 'push']
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send face verification failure notification
   */
  static async sendFaceVerificationFailed(userId, applicationId) {
    const notification = {
      type: 'face_verification_failed',
      userId,
      applicationId,
      title: 'Face Verification Failed',
      message: 'Face verification could not be completed. Please try again with better lighting and clear visibility.',
      priority: 'high',
      channels: ['in_app', 'email'],
      actionRequired: true,
      actionUrl: `/kyc/${applicationId}/face-verification`
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send KYC approval notification
   */
  static async sendKycApproved(userId, applicationId) {
    const notification = {
      type: 'kyc_approved',
      userId,
      applicationId,
      title: '🎉 KYC Approved!',
      message: 'Congratulations! Your identity verification is complete. You now have full access to SAHAJ services.',
      priority: 'high',
      channels: ['in_app', 'email', 'sms', 'push'],
      celebration: true
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send KYC under review notification
   */
  static async sendKycUnderReview(userId, applicationId) {
    const notification = {
      type: 'kyc_under_review',
      userId,
      applicationId,
      title: 'KYC Under Review',
      message: 'Your KYC application is under manual review. We\'ll notify you within 24-48 hours.',
      priority: 'normal',
      channels: ['in_app', 'email'],
      estimatedTime: '24-48 hours'
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send KYC rejection notification
   */
  static async sendKycRejected(userId, applicationId) {
    const notification = {
      type: 'kyc_rejected',
      userId,
      applicationId,
      title: 'KYC Application Rejected',
      message: 'Your KYC application could not be approved. Contact support for assistance or start a new application.',
      priority: 'high',
      channels: ['in_app', 'email', 'sms'],
      actionRequired: true,
      supportRequired: true
    };

    return await this.sendNotification(notification);
  }

  /**
   * Send OTP for verification
   */
  static async sendOtp(phone, otp, purpose = 'verification') {
    const message = `Your SAHAJ verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
    
    try {
      if (this.twilioClient) {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone.startsWith('+91') ? phone : `+91${phone}`
        });

        // Cache OTP for verification
        await redis.setex(`otp:${phone}:${purpose}`, 600, otp); // 10 minutes

        return {
          success: true,
          messageId: result.sid,
          phone: phone,
          expiresIn: 600
        };
      } else {
        // Fallback: Log OTP for development
        console.log(`OTP for ${phone}: ${otp}`);
        await redis.setex(`otp:${phone}:${purpose}`, 600, otp);
        
        return {
          success: true,
          messageId: 'dev_mode',
          phone: phone,
          expiresIn: 600,
          note: 'Development mode - OTP logged to console'
        };
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: 'Failed to send SMS',
        details: error.message
      };
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOtp(phone, otp, purpose = 'verification') {
    try {
      const cachedOtp = await redis.get(`otp:${phone}:${purpose}`);
      
      if (!cachedOtp) {
        return {
          success: false,
          error: 'OTP expired or not found',
          code: 'OTP_EXPIRED'
        };
      }

      if (cachedOtp !== otp) {
        return {
          success: false,
          error: 'Invalid OTP',
          code: 'INVALID_OTP'
        };
      }

      // OTP is valid, delete it
      await redis.del(`otp:${phone}:${purpose}`);

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        error: 'OTP verification failed',
        details: error.message
      };
    }
  }

  /**
   * Core notification sending function
   */
  static async sendNotification(notification) {
    const results = {
      notification,
      channels: {},
      success: false,
      timestamp: new Date().toISOString()
    };

    try {
      // Get user preferences and contact info
      const userInfo = await this.getUserNotificationInfo(notification.userId);
      if (!userInfo.success) {
        return {
          ...results,
          error: 'Failed to get user information'
        };
      }

      const { email, phone, language, preferences } = userInfo.data;

      // Send via each requested channel
      for (const channel of notification.channels) {
        switch (channel) {
          case 'email':
            if (email && (preferences.email ?? true)) {
              results.channels.email = await this.sendEmailNotification(
                email, 
                notification, 
                language
              );
            }
            break;

          case 'sms':
            if (phone && (preferences.sms ?? true)) {
              results.channels.sms = await this.sendSmsNotification(
                phone, 
                notification, 
                language
              );
            }
            break;

          case 'push':
            results.channels.push = await this.sendPushNotification(
              notification.userId, 
              notification
            );
            break;

          case 'in_app':
            results.channels.in_app = await this.saveInAppNotification(notification);
            break;
        }
      }

      // Check if at least one channel succeeded
      const channelResults = Object.values(results.channels);
      results.success = channelResults.some(result => result && result.success);

      // Create audit log
      await AuditLog.create({
        userId: notification.userId,
        action: 'NOTIFICATION_SENT',
        resourceType: 'Notification',
        details: {
          type: notification.type,
          channels: notification.channels,
          success: results.success,
          applicationId: notification.applicationId
        }
      });

      return results;
    } catch (error) {
      console.error('Notification sending error:', error);
      return {
        ...results,
        error: 'Failed to send notification',
        details: error.message
      };
    }
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(email, notification, language = 'en') {
    try {
      if (!this.emailTransporter) {
        return {
          success: false,
          error: 'Email service not configured'
        };
      }

      const template = this.getEmailTemplate(notification.type, language);
      const subject = template.subject.replace('{{title}}', notification.title);
      const html = template.html
        .replace('{{title}}', notification.title)
        .replace('{{message}}', notification.message)
        .replace('{{actionUrl}}', notification.actionUrl || '#');

      const result = await this.emailTransporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@sahaj.com',
        to: email,
        subject: subject,
        html: html,
        text: notification.message
      });

      return {
        success: true,
        messageId: result.messageId,
        channel: 'email'
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: 'Failed to send email',
        details: error.message
      };
    }
  }

  /**
   * Send SMS notification
   */
  static async sendSmsNotification(phone, notification, language = 'en') {
    try {
      const template = this.getSmsTemplate(notification.type, language);
      const message = template.replace('{{message}}', notification.message);

      return await this.sendSms(phone, message);
    } catch (error) {
      console.error('SMS notification error:', error);
      return {
        success: false,
        error: 'Failed to send SMS notification',
        details: error.message
      };
    }
  }

  /**
   * Send SMS using Twilio or fallback
   */
  static async sendSms(phone, message) {
    try {
      if (this.twilioClient) {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone.startsWith('+91') ? phone : `+91${phone}`
        });

        return {
          success: true,
          messageId: result.sid,
          channel: 'sms'
        };
      } else {
        // Development mode fallback
        console.log(`SMS to ${phone}: ${message}`);
        return {
          success: true,
          messageId: 'dev_mode',
          channel: 'sms',
          note: 'Development mode'
        };
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: 'Failed to send SMS',
        details: error.message
      };
    }
  }

  /**
   * Send push notification (implement with FCM or similar)
   */
  static async sendPushNotification(userId, notification) {
    // Placeholder for push notification implementation
    // Would integrate with Firebase Cloud Messaging or similar service
    
    try {
      // Save to Redis for client to poll
      const pushData = {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        actionUrl: notification.actionUrl,
        timestamp: new Date().toISOString()
      };

      await redis.lpush(`push:${userId}`, JSON.stringify(pushData));
      await redis.ltrim(`push:${userId}`, 0, 49); // Keep last 50 notifications
      await redis.expire(`push:${userId}`, 86400 * 7); // Expire after 7 days

      return {
        success: true,
        channel: 'push',
        method: 'redis_queue'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to queue push notification',
        details: error.message
      };
    }
  }

  /**
   * Save in-app notification
   */
  static async saveInAppNotification(notification) {
    try {
      const inAppData = {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionRequired: notification.actionRequired || false,
        priority: notification.priority || 'normal',
        read: false,
        timestamp: new Date().toISOString()
      };

      // Save to Redis for quick access
      await redis.lpush(
        `notifications:${notification.userId}`, 
        JSON.stringify(inAppData)
      );
      await redis.ltrim(`notifications:${notification.userId}`, 0, 99); // Keep last 100
      await redis.expire(`notifications:${notification.userId}`, 86400 * 30); // 30 days

      // Increment unread count
      await redis.incr(`unread_count:${notification.userId}`);
      await redis.expire(`unread_count:${notification.userId}`, 86400 * 30);

      return {
        success: true,
        channel: 'in_app'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to save in-app notification',
        details: error.message
      };
    }
  }

  /**
   * Get user notification preferences and contact info
   */
  static async getUserNotificationInfo(userId) {
    try {
      // This would typically fetch from user model/database
      // For now, return default preferences
      return {
        success: true,
        data: {
          email: 'user@example.com', // Would be fetched from user record
          phone: '+919999999999',    // Would be fetched from user record
          language: 'en',
          preferences: {
            email: true,
            sms: true,
            push: true,
            in_app: true
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get user information',
        details: error.message
      };
    }
  }

  /**
   * Notification templates
   */
  static getEmailTemplate(type, language = 'en') {
    const templates = {
      en: {
        kyc_approved: {
          subject: '🎉 {{title}} - SAHAJ',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">{{title}}</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">Access Your Account</a>
              <p style="margin-top: 20px; color: #666;">Thank you for choosing SAHAJ for your digital identity needs.</p>
            </div>
          `
        },
        kyc_rejected: {
          subject: '{{title}} - SAHAJ',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc3545;">{{title}}</h2>
              <p>{{message}}</p>
              <a href="{{actionUrl}}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Contact Support</a>
            </div>
          `
        }
        // Add more templates as needed
      },
      hi: {
        // Hindi templates would go here
      }
    };

    return templates[language]?.[type] || templates.en[type] || {
      subject: '{{title}}',
      html: '<p>{{message}}</p>'
    };
  }

  static getSmsTemplate(type, language = 'en') {
    const templates = {
      en: {
        kyc_approved: 'SAHAJ: {{message}} Login at sahaj.com',
        kyc_rejected: 'SAHAJ: {{message}} Contact support for assistance.',
        documents_rejected: 'SAHAJ: {{message}} Please resubmit documents.'
      },
      hi: {
        // Hindi SMS templates
      }
    };

    return templates[language]?.[type] || templates.en[type] || '{{message}}';
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      const notifications = await redis.lrange(
        `notifications:${userId}`, 
        offset, 
        offset + limit - 1
      );

      const parsedNotifications = notifications.map(n => JSON.parse(n));

      return {
        success: true,
        notifications: parsedNotifications,
        unreadCount: await redis.get(`unread_count:${userId}`) || 0
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get notifications',
        details: error.message
      };
    }
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(userId, notificationIds = 'all') {
    try {
      if (notificationIds === 'all') {
        await redis.del(`unread_count:${userId}`);
      }

      return {
        success: true,
        message: 'Notifications marked as read'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to mark notifications as read',
        details: error.message
      };
    }
  }
}
