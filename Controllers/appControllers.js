const express = require('express');
const userModel = require('./model/userModel');
const blogModel = require('./model/blogModel');
require('dotenv').config();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


const emailVerification = async (req, res) => {
    const {email} = req.body;
    console.log('data:', email)
    
    const otp = Math.floor(100000 + Math.random() * 900000);

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS);
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification',
        text: `Your one time password is: ${otp}`
      }
      console.log(mailOptions);
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            
          console.log("Error sending email: ",error)
          return res.status(500).json({ message: "Error sending email", error: error.message});
        }
        console.log("Email sent: ", info.response);
        res.status(200).json({
          message: "Email sent successfully",
          otp: otp
        })
    })
    }catch (error) {
        console.error("Error sending email:", error);
    }
}

const userDetails = {
    try {
        const user = await userModel.find().select('-password').populate('blog');
        res.json({
            message: "Welcome to the User API",
            users: user
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error });
    }
}

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = new userModel({
            name,
            email,
            password: hashedPassword
        });
        await newUser.save();
        const userresponse = {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            blog: newUser.blog
        };
        res.status(201).json({
            message: "User registered successfully",
            user: userresponse
        });
        console.log("User created successfully:", userresponse);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Error creating user", error: error.message });
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Login attempt with email:", email, " and password:", password);
        const user = await userModel.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token =jwt.sign({
            userId: user._id,
            email: user.email
        },process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            blog: user.blog
        };

        res.json({
            message: "Login successful",
            user: userResponse,
            token: token
        });
        console.log("User logged in successfully:", userResponse);
        console.log("Token generated:", token);
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Error during login", error: error.message });
    }
}

const createBlogs = async (req, res) => {
    try{
        const { title, content } = req.body;
        const image =`/uploads/${req.file.filename}`;
        console.log("Image path:", image);
        const userId = req.params.id;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const newBlog = new blogModel({
            title: title,
            content: content,
            user: userId,
            image: image
        });
        user.blog.push(newBlog._id);
        await newBlog.save();
        await user.save();
        res.status(201).json({
            message: "Blog created successfully",
            blog: newBlog
        });
        console.log("Blog created successfully:", newBlog);
    }catch (error) {
        console.error("Error creating blog:", error);
        res.status(500).json({ message: "Server error during blog creation", error: error.message });
    }
}

const GetAllBlogsById = async (req, res) => {
  // More RESTful route
  try {
    const { userId } = req.params;
    const user = await userModel.findById(userId).populate("blog");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      name: user.name,
      message: "User blogs fetched successfully",
      blogs: user.blog,
    });
    console.log("User blogs fetched successfully", user.blog);
  } catch (error) {
    res.status(500).json({
      message: "Server error during fetching user blogs",
      error: error.message,
    });
  }
}

const allBlogs = async (req, res) => {
    try {
        const blogs = await blogModel.find().populate("user", "name email");
        res.json({
            message: "All blogs fetched successfully",
            blogs: blogs,
        });
        console.log("All blogs fetched successfully", blogs);
    } catch (error) {
        res.status(500).json({
            message: "Server error during fetching all blogs",
            error: error.message,
        });
    }
}

const updateBlogs = async (req, res) => {
    try{
        const blogId = req.params.blogId;
        const { title, content} = req.body;
        const image = `/uploads/${req.file.filename}`;
        const blog = await blogModel.findById(blogId);

        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        const updatedBlog = await blogModel.findByIdAndUpdate(
          blogId,
          { title, content , image},
          { new: true }
        );

        res.status(200).json({
            message: "Blog updated successfully",
            blog: updatedBlog
        });
    }catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ message: "Server error during blog updatess", error: error.message });
    }
}

const deleteBlogs = async (req, res) => {
    try {
        const blogId = req.params.blogId;
        const blog = await blogModel.findById(blogId);
        await blogModel.findOneAndDelete({_id: blogId});

        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        const userId = blog.user.toString();
        
        console.log("Blog deleted successfully:", blog);
        res.status(200).json({
            message: "Blog deleted successfully",
            blog: blog
        });
    } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({ message: "Server error during blog deletion", error: error.message });
    }
}

module.exports = {emailVerification, userDetails, register, login, createBlogs, GetAllBlogsById, allBlogs, updateBlogs, deleteBlogs}