import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { ViewStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

type TabIconProps = {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
};

function TabIcon({ name, color }: TabIconProps) {
  return <FontAwesome name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const { userType } = useAuth();
  const isPandit = userType === 'pandit';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange600,
        tabBarInactiveTintColor: colors.ink500,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: colors.border200,
          height: 64,
          paddingVertical: 6,
        } as ViewStyle,
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemi,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color }) => <TabIcon name="star" color={color} />,
          href: isPandit ? null : '/(tabs)/services',
        }}
      />
      <Tabs.Screen
        name="pandits"
        options={{
          title: 'Pandits',
          tabBarIcon: ({ color }) => <TabIcon name="users" color={color} />,
          href: isPandit ? null : '/(tabs)/pandits',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="user-circle" color={color} />,
        }}
      />
    </Tabs>
  );
}
