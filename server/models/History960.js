import mongoose from "mongoose";
import History from "./History.js";

const History960Schema = History.schema.clone();

const History960 =
  mongoose.models.History960 ||
  mongoose.model("History960", History960Schema, "history960");

export default History960;
