import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import AuthContext from '../../context/auth/authContext';

const UserSettings = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  const { user } = authContext;

  const [formData, setFormData] = useState({
    name: user ? user.name : '',
    email: user ? user.email : '',
    bio: user ? user.bio || '' : '',
    darkMode: true
  });

  const { name, email, bio, darkMode } = formData;

  const onChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const onSubmit = e => {
    e.preventDefault();
    // Update user profile logic would go here
    console.log('Profile updated');
  };

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">User Settings</Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Profile</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 80, height: 80, mr: 2 }}>
            {name ? name.charAt(0) : 'U'}
          </Avatar>
          <Box>
            <Typography variant="body1">{name}</Typography>
            <Typography variant="body2" color="text.secondary">{email}</Typography>
            <Button 
              component="label" 
              size="small" 
              startIcon={<PhotoCameraIcon />}
              sx={{ mt: 1 }}
            >
              Change photo
              <input type="file" hidden />
            </Button>
          </Box>
        </Box>

        <Box component="form" onSubmit={onSubmit}>
          <TextField
            margin="normal"
            fullWidth
            label="Name"
            name="name"
            value={name}
            onChange={onChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Email"
            name="email"
            value={email}
            disabled
          />
          <TextField
            margin="normal"
            fullWidth
            label="Bio"
            name="bio"
            value={bio}
            onChange={onChange}
            multiline
            rows={3}
          />
          <Button 
            type="submit" 
            variant="contained" 
            sx={{ mt: 2 }}
          >
            Save Changes
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Account</Typography>
        
        <Button 
          variant="outlined" 
          startIcon={<ShoppingCartIcon />}
          onClick={() => navigate('/shop')}
          fullWidth
          sx={{ mb: 2 }}
        >
          Shop for Premium Accounts
        </Button>
        
        <FormControlLabel 
          control={
            <Switch 
              checked={darkMode} 
              onChange={onChange} 
              name="darkMode" 
            />
          } 
          label="Dark Mode" 
        />
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Security</Typography>
        
        <Button variant="outlined" color="primary">
          Change Password
        </Button>
      </Paper>
    </Box>
  );
};

export default UserSettings;