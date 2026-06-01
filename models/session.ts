import mongoose from 'mongoose';

const RepositorySnapshotSchema = new mongoose.Schema(
  {
    fullName: String,
    branch: String,
    defaultBranch: String,
    private: Boolean,
    htmlUrl: String,
    latestCommitSha: String,
  },
  { _id: false }
);

const FeatureAnalysisSchema = new mongoose.Schema(
  {
    featureTitle: String,
    featureDescription: String,
    extractedFeature: String,
    compatibilityAnalysis: String,
    implementationSuggestions: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const SessionSchema = new mongoose.Schema({
  idealRepo: String,
  userRepo: String,
  idealBranch: String,
  userBranch: String,
  status: {
    type: String,
    enum: ['validating', 'indexing', 'ready', 'failed'],
    default: 'validating',
  },
  statusMessage: String,
  sourceRepository: RepositorySnapshotSchema,
  targetRepository: RepositorySnapshotSchema,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  extractedFeature: String,
  compatibilityAnalysis: String,
  implementationSuggestions: String,
  analyses: [FeatureAnalysisSchema],
});

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);
