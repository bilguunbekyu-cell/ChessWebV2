import mongoose from "mongoose";

const AdminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    adminEmail: {
      type: String,
      default: "",
      trim: true,
      maxlength: 320,
    },
    method: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 16,
      index: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1024,
    },
    statusCode: {
      type: Number,
      default: 0,
      index: true,
    },
    ip: {
      type: String,
      default: "",
      trim: true,
      maxlength: 128,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
      maxlength: 512,
    },
    durationMs: {
      type: Number,
      default: 0,
      min: 0,
    },
    query: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ method: 1, createdAt: -1 });
AdminAuditLogSchema.index({ statusCode: 1, createdAt: -1 });

const AdminAuditLog =
  mongoose.models.AdminAuditLog ||
  mongoose.model("AdminAuditLog", AdminAuditLogSchema);

export default AdminAuditLog;
