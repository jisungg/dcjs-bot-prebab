const { Schema, model } = require("mongoose");

const userSchema = Schema(
  {
    _id: String,
    following: Array,
    followers: Array
  },
  { versionKey: false }
);

module.exports = model("userSchema", userSchema);
