import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import PublicIcon from '@mui/icons-material/Public';
import Fab from '@mui/material/Fab';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';

import ChatContext from '../../context/chat/chatContext';

const ChannelList = () => {
  const chatContext = useContext(ChatContext);
  const navigate = useNavigate();

  const { channels, setCurrentChannel } = chatContext;

  const getChannelIcon = (type) => {
    switch (type) {
      case 'direct':
        return <PersonIcon />;
      case 'group':
        return <GroupIcon />;
      case 'public':
        return <PublicIcon />;
      default:
        return <ChatIcon />;
    }
  };

  const onChannelSelect = (channel) => {
    setCurrentChannel(channel);
    navigate(`/channels/${channel._id}`);
  };

  return (
    <>
      <List>
        {channels.map((channel) => (
          <ListItem key={channel._id} disablePadding>
            <ListItemButton onClick={() => onChannelSelect(channel)}>
              <ListItemIcon>
                {getChannelIcon(channel.type)}
              </ListItemIcon>
              <ListItemText primary={channel.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Fab color="primary" size="small" aria-label="add channel">
          <AddIcon />
        </Fab>
      </Box>

      <Box sx={{ marginTop: 'auto', p: 2 }}>
        <Button 
          variant="outlined" 
          fullWidth 
          onClick={() => navigate('/settings')}
        >
          Settings
        </Button>
      </Box>
    </>
  );
};

export default ChannelList;