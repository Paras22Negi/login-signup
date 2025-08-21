const express = require('express');
const {emailVerification, userDetails, register, login, createBlogs, GetAllBlogsById, allBlogs, updateBlogs, deleteBlogs} = require('../Controllers/appControllers')
const router = express.Router();
const verifyToken = require('../Middleware/verifyToken');
const upload = require("../multerStorage");

router.post('/verify-email', emailVerification);

router.get('/users', userDetails);

router.post('/register', register);

router.post('/login', login);

router.post('/blogs/:id', upload.single('image'), createBlogs);

router.get('/blogs/:userId', verifyToken, GetAllBlogsById);

router.get('/blogs', allBlogs);

router.put('/blogs/:blogId', upload.single('image'), updateBlogs);

router.delete('/blogs/:blogId', deleteBlogs);

module.exports = router;