import {
  GET_CHANNELS,
  ADD_CHANNEL,
  SET_CURRENT_CHANNEL,
  CLEAR_CURRENT_CHANNEL,
  CHANNEL_ERROR,
  GET_MESSAGES,
  ADD_MESSAGE,
  MESSAGE_ERROR,
  SET_LOADING
} from '../types';

const chatReducer = (state, action) => {
  switch (action.type) {
    case GET_CHANNELS:
      return {
        ...state,
        channels: action.payload,
        loading: false
      };
    case ADD_CHANNEL:
      return {
        ...state,
        channels: [...state.channels, action.payload],
        loading: false
      };
    case SET_CURRENT_CHANNEL:
      return {
        ...state,
        currentChannel: action.payload
      };
    case CLEAR_CURRENT_CHANNEL:
      return {
        ...state,
        currentChannel: null,
        messages: []
      };
    case CHANNEL_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case GET_MESSAGES:
      return {
        ...state,
        messages: action.payload,
        loading: false
      };
    case ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
        loading: false
      };
    case MESSAGE_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case SET_LOADING:
      return {
        ...state,
        loading: true
      };
    default:
      return state;
  }
};

export default chatReducer;