const express = require('express');
const mongoose = require('mongoose');




const blogSchema = mongoose.Schema({
  title: String,
  content: String,
  image: Object,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = mongoose.model("Blog", blogSchema);
