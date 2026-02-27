import mongoose from "mongoose";

const featuredEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["tournament", "match", "broadcast", "event"],
      default: "event",
    },

    lichessUrl: {
      type: String,
      trim: true,
    },

    imageUrl: {
      type: String,
      trim: true,
    },

    players: [
      {
        name: String,
        rating: Number,
        title: String, 
        country: String,
      },
    ],

    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["upcoming", "live", "completed"],
      default: "upcoming",
    },

    featured: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0, 
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    viewers: {
      type: Number,
      default: 0,
    },

    tags: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  },
);

featuredEventSchema.index({ status: 1, isActive: 1, priority: -1 });
featuredEventSchema.index({ featured: 1, isActive: 1 });

export default mongoose.model("FeaturedEvent", featuredEventSchema);
