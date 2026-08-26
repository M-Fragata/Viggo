import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { Clock, Calendar, Tablet, LayoutDashboard } from 'lucide-react-native';

export default function AppLayout() {
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="punch"
        options={{
          title: 'Registrar Ponto',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="totem"
        options={{
          title: 'Totem',
          tabBarIcon: ({ color, size }) => <Tablet size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Painel Admin',
          href: isAdmin ? '/admin' : null,
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
