/**
 * Analytics Service
 * 
 * Provides comprehensive analytics for KYC operations:
 * - User verification metrics
 * - Document processing analytics
 * - Face recognition performance
 * - System health monitoring
 * - Business intelligence dashboards
 * 
 * @author KYC Backend Team
 */

import { User, KycApplication, Document, FaceVerification, AuditLog } from '../models/index.js';
import { connectMongoDB } from '../lib/mongodb.js';
import { logger } from '../lib/logger.js';

class AnalyticsService {
  constructor() {
    this.connectMongoDB = connectMongoDB;
  }

  /**
   * Get KYC completion funnel analytics
   */
  async getKycFunnelAnalytics(startDate, endDate) {
    try {
      await this.connectMongoDB();

      const dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      // Aggregate funnel data
      const funnelData = await KycApplication.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            averageProcessingTime: {
              $avg: {
                $cond: [
                  { $in: ['$status', ['approved', 'rejected']] },
                  { $subtract: ['$updatedAt', '$createdAt'] },
                  null
                ]
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get daily trends
      const dailyTrends = await KycApplication.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Get rejection reasons
      const rejectionReasons = await KycApplication.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: 'rejected',
            'verificationResults.rejectionReason': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$verificationResults.rejectionReason',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        funnel: funnelData,
        dailyTrends: dailyTrends,
        rejectionReasons: rejectionReasons,
        summary: {
          totalApplications: funnelData.reduce((sum, item) => sum + item.count, 0),
          approvalRate: this.calculateApprovalRate(funnelData),
          averageProcessingTime: this.calculateAverageProcessingTime(funnelData)
        }
      };
    } catch (error) {
      logger.error('Failed to get KYC funnel analytics', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get document verification analytics
   */
  async getDocumentAnalytics(startDate, endDate) {
    try {
      await this.connectMongoDB();

      const dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      // Document type distribution
      const documentTypes = await Document.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            averageOcrConfidence: { $avg: '$ocrResults.confidence' },
            verificationSuccessRate: {
              $avg: {
                $cond: [
                  { $eq: ['$verificationStatus', 'verified'] },
                  1, 0
                ]
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // OCR performance metrics
      const ocrPerformance = await Document.aggregate([
        { 
          $match: {
            ...dateFilter,
            'ocrResults.confidence': { $exists: true }
          }
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $gte: ['$ocrResults.confidence', 0.9] }, then: 'high' },
                  { case: { $gte: ['$ocrResults.confidence', 0.7] }, then: 'medium' },
                  { case: { $gte: ['$ocrResults.confidence', 0.5] }, then: 'low' }
                ],
                default: 'very_low'
              }
            },
            count: { $sum: 1 },
            averageConfidence: { $avg: '$ocrResults.confidence' }
          }
        }
      ]);

      // Processing time analysis
      const processingTimes = await Document.aggregate([
        { $match: dateFilter },
        {
          $project: {
            type: 1,
            processingTime: {
              $cond: [
                { $and: ['$ocrResults.processedAt', '$createdAt'] },
                { $subtract: ['$ocrResults.processedAt', '$createdAt'] },
                null
              ]
            }
          }
        },
        { $match: { processingTime: { $ne: null } } },
        {
          $group: {
            _id: '$type',
            averageProcessingTime: { $avg: '$processingTime' },
            medianProcessingTime: { $median: '$processingTime' },
            maxProcessingTime: { $max: '$processingTime' },
            minProcessingTime: { $min: '$processingTime' }
          }
        }
      ]);

      return {
        documentTypes: documentTypes,
        ocrPerformance: ocrPerformance,
        processingTimes: processingTimes,
        summary: {
          totalDocuments: documentTypes.reduce((sum, item) => sum + item.count, 0),
          averageOcrConfidence: documentTypes.reduce((sum, item, _, arr) => 
            sum + (item.averageOcrConfidence / arr.length), 0),
          overallVerificationRate: documentTypes.reduce((sum, item, _, arr) => 
            sum + (item.verificationSuccessRate / arr.length), 0)
        }
      };
    } catch (error) {
      logger.error('Failed to get document analytics', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get face verification analytics
   */
  async getFaceVerificationAnalytics(startDate, endDate) {
    try {
      await this.connectMongoDB();

      const dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      // Liveness detection performance
      const livenessStats = await FaceVerification.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalVerifications: { $sum: 1 },
            livenessDetected: {
              $sum: { $cond: ['$results.isLive', 1, 0] }
            },
            averageConfidence: { $avg: '$results.confidence' },
            averageLivenessScore: { $avg: '$results.livenessScore' },
            spoofingAttempts: {
              $sum: { $cond: ['$results.antiSpoofing.detected', 1, 0] }
            }
          }
        }
      ]);

      // Face matching accuracy
      const matchingStats = await FaceVerification.aggregate([
        { 
          $match: {
            ...dateFilter,
            verificationType: 'face_match'
          }
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $gte: ['$results.matchScore', 0.9] }, then: 'high_match' },
                  { case: { $gte: ['$results.matchScore', 0.7] }, then: 'medium_match' },
                  { case: { $gte: ['$results.matchScore', 0.5] }, then: 'low_match' }
                ],
                default: 'no_match'
              }
            },
            count: { $sum: 1 },
            averageMatchScore: { $avg: '$results.matchScore' }
          }
        }
      ]);

      // Device and environment analysis
      const deviceAnalysis = await FaceVerification.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              device: '$metadata.device.type',
              lighting: '$results.environmentalFactors.lighting'
            },
            count: { $sum: 1 },
            successRate: {
              $avg: { $cond: ['$results.isLive', 1, 0] }
            },
            averageConfidence: { $avg: '$results.confidence' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        livenessStats: livenessStats[0] || {},
        matchingStats: matchingStats,
        deviceAnalysis: deviceAnalysis,
        summary: {
          totalVerifications: livenessStats[0]?.totalVerifications || 0,
          livenessSuccessRate: livenessStats[0] ? 
            (livenessStats[0].livenessDetected / livenessStats[0].totalVerifications) : 0,
          spoofingDetectionRate: livenessStats[0] ? 
            (livenessStats[0].spoofingAttempts / livenessStats[0].totalVerifications) : 0,
          averageConfidence: livenessStats[0]?.averageConfidence || 0
        }
      };
    } catch (error) {
      logger.error('Failed to get face verification analytics', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get user demographics and behavior analytics
   */
  async getUserAnalytics(startDate, endDate) {
    try {
      await this.connectMongoDB();

      const dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      // Geographic distribution
      const geographic = await User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              state: '$address.state',
              city: '$address.city'
            },
            count: { $sum: 1 },
            kycCompletionRate: {
              $avg: { $cond: [{ $eq: ['$kycStatus', 'approved'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // Age distribution
      const ageDistribution = await User.aggregate([
        { $match: dateFilter },
        {
          $project: {
            age: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), '$personalInfo.dateOfBirth'] },
                  365.25 * 24 * 60 * 60 * 1000
                ]
              }
            },
            kycStatus: 1
          }
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $lt: ['$age', 25] }, then: '18-24' },
                  { case: { $lt: ['$age', 35] }, then: '25-34' },
                  { case: { $lt: ['$age', 45] }, then: '35-44' },
                  { case: { $lt: ['$age', 55] }, then: '45-54' },
                  { case: { $lt: ['$age', 65] }, then: '55-64' }
                ],
                default: '65+'
              }
            },
            count: { $sum: 1 },
            kycCompletionRate: {
              $avg: { $cond: [{ $eq: ['$kycStatus', 'approved'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Language preferences
      const languageStats = await User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$preferredLanguage',
            count: { $sum: 1 },
            kycCompletionRate: {
              $avg: { $cond: [{ $eq: ['$kycStatus', 'approved'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // User activity patterns
      const activityPatterns = await AuditLog.aggregate([
        { 
          $match: {
            ...dateFilter,
            action: { $in: ['USER_LOGIN', 'KYC_APPLICATION_CREATED', 'DOCUMENT_UPLOADED'] }
          }
        },
        {
          $group: {
            _id: {
              hour: { $hour: '$createdAt' },
              action: '$action'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.hour': 1 } }
      ]);

      return {
        geographic: geographic,
        ageDistribution: ageDistribution,
        languageStats: languageStats,
        activityPatterns: activityPatterns,
        summary: {
          totalUsers: geographic.reduce((sum, item) => sum + item.count, 0),
          topStates: geographic.slice(0, 5).map(item => ({
            state: item._id.state,
            users: item.count,
            completionRate: item.kycCompletionRate
          }))
        }
      };
    } catch (error) {
      logger.error('Failed to get user analytics', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get system performance analytics
   */
  async getSystemAnalytics(startDate, endDate) {
    try {
      await this.connectMongoDB();

      const dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      // API response times
      const apiPerformance = await AuditLog.aggregate([
        { 
          $match: {
            ...dateFilter,
            'metadata.responseTime': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$resource',
            averageResponseTime: { $avg: '$metadata.responseTime' },
            maxResponseTime: { $max: '$metadata.responseTime' },
            requestCount: { $sum: 1 },
            errorRate: {
              $avg: {
                $cond: [
                  { $gte: ['$metadata.statusCode', 400] },
                  1, 0
                ]
              }
            }
          }
        },
        { $sort: { requestCount: -1 } }
      ]);

      // Error analysis
      const errorAnalysis = await AuditLog.aggregate([
        { 
          $match: {
            ...dateFilter,
            'metadata.statusCode': { $gte: 400 }
          }
        },
        {
          $group: {
            _id: {
              resource: '$resource',
              statusCode: '$metadata.statusCode'
            },
            count: { $sum: 1 },
            examples: { $push: '$metadata.error' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // Database performance
      const dbStats = await Promise.all([
        User.countDocuments(dateFilter),
        KycApplication.countDocuments(dateFilter),
        Document.countDocuments(dateFilter),
        FaceVerification.countDocuments(dateFilter)
      ]);

      return {
        apiPerformance: apiPerformance,
        errorAnalysis: errorAnalysis,
        dbStats: {
          newUsers: dbStats[0],
          newApplications: dbStats[1],
          newDocuments: dbStats[2],
          newVerifications: dbStats[3]
        },
        summary: {
          totalRequests: apiPerformance.reduce((sum, item) => sum + item.requestCount, 0),
          averageResponseTime: apiPerformance.reduce((sum, item, _, arr) => 
            sum + (item.averageResponseTime / arr.length), 0),
          overallErrorRate: apiPerformance.reduce((sum, item, _, arr) => 
            sum + (item.errorRate / arr.length), 0)
        }
      };
    } catch (error) {
      logger.error('Failed to get system analytics', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardAnalytics(period = '7d') {
    try {
      const endDate = new Date();
      const startDate = new Date();

      // Calculate start date based on period
      switch (period) {
        case '24h':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      // Get all analytics in parallel
      const [kycFunnel, documents, faceVerification, users, system] = await Promise.all([
        this.getKycFunnelAnalytics(startDate, endDate),
        this.getDocumentAnalytics(startDate, endDate),
        this.getFaceVerificationAnalytics(startDate, endDate),
        this.getUserAnalytics(startDate, endDate),
        this.getSystemAnalytics(startDate, endDate)
      ]);

      return {
        period: period,
        dateRange: { startDate, endDate },
        kycFunnel: kycFunnel,
        documents: documents,
        faceVerification: faceVerification,
        users: users,
        system: system,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get dashboard analytics', {
        error: error.message,
        period
      });
      throw error;
    }
  }

  /**
   * Helper method to calculate approval rate
   */
  calculateApprovalRate(funnelData) {
    const approved = funnelData.find(item => item._id === 'approved')?.count || 0;
    const total = funnelData.reduce((sum, item) => sum + item.count, 0);
    return total > 0 ? (approved / total) * 100 : 0;
  }

  /**
   * Helper method to calculate average processing time
   */
  calculateAverageProcessingTime(funnelData) {
    const processedItems = funnelData.filter(item => 
      item.averageProcessingTime && item.averageProcessingTime > 0
    );
    
    if (processedItems.length === 0) return 0;
    
    return processedItems.reduce((sum, item) => 
      sum + item.averageProcessingTime, 0) / processedItems.length;
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export { analyticsService };
export default analyticsService;
