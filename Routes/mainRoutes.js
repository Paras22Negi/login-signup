const express = require('express');
const {emailVerification, userDetails, register, login, createBlogs, GetAllBlogsById, allBlogs, updateBlogs, deleteBlogs} = require('./Controllers/appControllers')
const router = express.Router();

router.post('/verify-email', emailVerification);

router.get('/users', userDetails);

router.post('/register', register);

router.post('/login', login);

router.post('/blogs/:id', createBlogs);

router.get('/blogs/:userId', GetAllBlogsById);

router.get('/blogs', allBlogs);

router.put('/blogs/:blogId', updateBlogs);

router.delete('/blogs/:blogId', deleteBlogs);

module.exports = router;