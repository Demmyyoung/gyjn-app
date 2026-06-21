import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

if (Constants.appOwnership !== 'expo') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('Notifications.setNotificationHandler failed (probably missing native binary packages):', e);
  }
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        if (userId) {
          saveTokenToDatabase(token, userId);
        }
      }
    });

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received in foreground:', notification);
      });
    } catch (e) {
      console.warn('Failed to add notification received listener:', e);
    }

    try {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('User interacted with notification:', response);
        // Navigation logic could go here if navigation context is available
      });
    } catch (e) {
      console.warn('Failed to add notification response listener:', e);
    }

    return () => {
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
      } catch (e) {
        console.warn('Failed to remove notification listener:', e);
      }
      try {
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (e) {
        console.warn('Failed to remove notification response listener:', e);
      }
    };
  }, [userId]);

  return { expoPushToken };
}

export function GlobalNotificationHandler() {
  usePushNotifications();
  return null;
}

async function saveTokenToDatabase(token, userId) {
  // Update both tables since we don't know the exact role here
  // The update will only succeed for the table where the user ID exists
  const { error: seekerError } = await supabase
    .from('seeker_profiles')
    .update({ push_token: token })
    .eq('id', userId);
    
  if (seekerError && seekerError.code !== 'PGRST116') {
    console.error('Failed to save push token to seeker_profiles:', seekerError);
  }

  const { error: employerError } = await supabase
    .from('employer_profiles')
    .update({ push_token: token })
    .eq('id', userId);
    
  if (employerError && employerError.code !== 'PGRST116') {
    console.error('Failed to save push token to employer_profiles:', employerError);
  }
}

async function registerForPushNotificationsAsync() {
  let token;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  } catch (e) {
    console.warn('Failed to set notification channel:', e);
  }

  try {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      // Learn more about projectId:
      // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        
        if (!projectId) {
          console.warn('Project ID not found. Ensure app.json is configured correctly for EAS.');
        }
        
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (e) {
        token = `${e}`;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  } catch (e) {
    console.warn('Error during registerForPushNotificationsAsync:', e);
  }

  return token;
}
