import React from 'react';

import {
  Image,
  Alert,
} from 'react-native';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import Icon from 'react-native-vector-icons/MaterialIcons';

import Dashboard from './tabs/dashboard';
import Rank from './ludo2/rank';
import Notification from './tabs/notification';
import Run from './ludo2/run2';
import NewUpload from './tabs/newupload';
import Upload from './tabs/uploads';

import {
  API_BASE_URL,
  authHeaders,
} from './api';

const diceIcon = require('./assets/newAssets/bgdice.png');

const Tab =
  createBottomTabNavigator();

const isCurrentUserActiveOnBoard = async () => {
  const boardId = (globalThis as any).boardId;
  const userId = (globalThis as any).userId;
  const flmId = (globalThis as any).flmId;

  if (!boardId || !userId || !flmId) {
    return false;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/active-player/board/${boardId}`,
      {
        headers: authHeaders(
          (globalThis as any).sessionToken,
        ),
      },
    );
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];

    return rows.some(
      (player: any) =>
        String(player.playerId) === String(userId) &&
        String(player.flmId) === String(flmId),
    );
  } catch (err) {
    console.log('active player check error', err);
    return !!(globalThis as any).isMyBoardActivePlayer;
  }
};

// Helper function to create tabPress listener for other tabs
const createLeaveRunListener = (targetScreenName: string) => (
  { navigation }: any
) => ({
  tabPress: async (e: any) => {
    const goToTargetTab = () => {
      if (typeof navigation.jumpTo === 'function') {
        navigation.jumpTo(targetScreenName);
        return;
      }

      navigation.navigate(targetScreenName);
    };

    // Listener is only attached to non-Run tabs, so any active board means
    // this tab press is attempting to leave the board screen.
    if ((globalThis as any).boardId) {
      e.preventDefault();

      const isActivePlayer =
        await isCurrentUserActiveOnBoard();

      if (!isActivePlayer) {
        goToTargetTab();
        return;
      }

      Alert.alert(
        'Leave Board',
        'Want to leave board?',
        [
          {
            text: 'No',
            style: 'cancel',
          },

          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              try {
                await fetch(
                  `${API_BASE_URL}/api/active-player/end`,
                  {
                    method: 'POST',
                    headers: {
                      ...authHeaders(
                        (globalThis as any)
                          .sessionToken,
                      ),
                      'Content-Type':
                        'application/json',
                    },
                    body: JSON.stringify(
                      {
                        boardId:
                          (globalThis as any)
                            .boardId,
                        playerId:
                          (globalThis as any)
                            .userId,
                        flmId:
                          (globalThis as any)
                            .flmId,
                      },
                    ),
                  },
                );

                (globalThis as any).boardId =
                  null;
                (globalThis as any).isMyBoardActivePlayer =
                  false;

                if (
                  typeof (globalThis as any)
                    .resetRunBoardState ===
                  'function'
                ) {
                  (globalThis as any)
                    .resetRunBoardState();
                }

                goToTargetTab();
              } catch (err) {
                console.log(
                  'leave game error',
                  err,
                );
              }
            },
          },
        ],
      );
    }
  },
});

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,

        headerShown: false,

        tabBarIcon: ({
          color,
          size,
          focused,
        }) => {
          if (route.name === 'Run') {
            return (
              <Image
                source={diceIcon}
                style={{
                  width: size + 4,
                  height: size + 4,
                  resizeMode:
                    'contain',

                  tintColor: focused
                    ? '#7600fd'
                    : '#888',
                }}
              />
            );
          }

          const icons: Record<
            string,
            string
          > = {
            Dashboard: 'home',

            Rank: 'emoji-events',

            Notification:
              'notifications',

            NewUpload:
              'cloud-upload',

            Upload: 'thumb-up',
          };

          return (
            <Icon
              name={icons[route.name]}
              size={size + 6}
              color={color}
            />
          );
        },

        tabBarActiveTintColor:
          '#7600fd',

        tabBarInactiveTintColor:
          '#888',

        tabBarStyle: {
          backgroundColor:
            '#0B132B',

          height: 70,

          paddingBottom: 10,

          paddingTop: 6,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={Dashboard}
        listeners={createLeaveRunListener(
          'Dashboard',
        )}
      />

      <Tab.Screen
        name="Run"
        component={Run}
      />

      <Tab.Screen
        name="Rank"
        component={Rank}
        listeners={createLeaveRunListener(
          'Rank',
        )}
      />

      <Tab.Screen
        name="NewUpload"
        component={NewUpload}
        listeners={createLeaveRunListener(
          'NewUpload',
        )}
      />

      <Tab.Screen
        name="Upload"
        component={Upload}
        listeners={createLeaveRunListener(
          'Upload',
        )}
      />

      <Tab.Screen
        name="Notification"
        component={Notification}
        listeners={createLeaveRunListener(
          'Notification',
        )}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
