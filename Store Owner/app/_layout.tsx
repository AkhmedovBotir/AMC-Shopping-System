import { Ionicons } from "@expo/vector-icons";
import { DrawerContentComponentProps, DrawerContentScrollView } from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";
import React, { useState, useEffect } from "react";
import { Animated, Image, Platform, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useRouter, usePathname, useNavigation } from "expo-router";

// Routes that should be hidden from the drawer
const HIDDEN_ROUTES = [
  '_sitemap', 
  '+not-found', 
  '[...missing]', 
  'login',
  'reports',
  'subcategories',
  'screens',
  'components',
  'context'
];

// Statistics menu items
const STATISTICS_ROUTES: Array<{
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  // { name: 'statistics/warehouse', label: 'Ombor statistikasi', icon: 'cube-outline' },
  { name: 'statistics/sales', label: 'Sotuvlar statistikasi', icon: 'bar-chart-outline' },
  { name: 'statistics/daily', label: 'Kunlik statistika', icon: 'today-outline' },
  { name: 'statistics/weekly', label: 'Haftalik statistika', icon: 'calendar-outline' },
  { name: 'statistics/monthly', label: 'Oylik statistika', icon: 'calendar-number-outline' },
  // { name: 'statistics/sellers', label: 'Sotuvchilar statistikasi', icon: 'people-outline' }
];

// Menu items configuration
const MENU_ITEMS: Array<{
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { name: 'index', label: 'Dashboard', icon: 'home-outline' },
  { name: 'sellers', label: 'Sotuvchilar', icon: 'people-outline' },
  { name: 'categories', label: 'Kategoriyalar', icon: 'grid-outline' },
  { name: 'products', label: 'Mahsulotlar', icon: 'cube-outline' },
  { name: 'sales', label: 'Sotuvlar', icon: 'cart-outline' },
  { name: 'statistics', label: 'Statistika', icon: 'stats-chart-outline' },
  { name: 'profile', label: 'Profil', icon: 'person-outline' }
];

interface DrawerItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  rightIcon?: React.ReactNode;
}

const DrawerItem: React.FC<DrawerItemProps> = ({ 
  icon, 
  label, 
  isActive, 
  onPress, 
  rightIcon 
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.menuItem,
      isActive && styles.menuItemActive
    ]}
  >
    <View style={styles.menuItemContent}>
      <Ionicons 
        name={icon} 
        size={24} 
        color={isActive ? '#fff' : '#333'} 
        style={styles.menuIcon} 
      />
      <Text style={[
        styles.menuLabel,
        isActive && styles.menuLabelActive
      ]}>
        {label}
      </Text>
      {rightIcon}
    </View>
  </TouchableOpacity>
);

interface CustomDrawerContentProps extends DrawerContentComponentProps {
  onClose?: () => void;
}

function CustomDrawerContent({ onClose, ...props }: CustomDrawerContentProps) {
  const { admin, logout } = useAuth();
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const isWeb = Platform.OS === 'web';
  const currentRoute = props.state.routes[props.state.index || 0].name;
  
  const handleLogout = async () => {
    try {
      await logout();
      if (onClose) onClose();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = (screen: string) => {
    if (onClose) onClose();
    props.navigation.navigate(screen);
  };

  const toggleStats = () => {
    setIsStatsOpen(!isStatsOpen);
    Animated.timing(animation, {
      toValue: isStatsOpen ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotateZ = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <DrawerContentScrollView {...props} style={styles.drawer}>
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>
        <Text style={styles.adminName}>{admin?.name || 'Admin'}</Text>
        <Text style={styles.adminRole}>
          {admin?.shopName || 'Do\'kon egasi'}
        </Text>
      </View>

      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item) => {
          const routeIndex = props.state.routeNames.indexOf(item.name);
          const isFocused = routeIndex === props.state.index;

          if (item.name === 'statistics') {
            return (
              <View key={item.name}>
                <DrawerItem
                  icon={item.icon}
                  label={item.label}
                  isActive={isFocused}
                  onPress={toggleStats}
                  rightIcon={
                    <Animated.View style={{ transform: [{ rotateZ }] }}>
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={isFocused ? '#fff' : '#333'} 
                      />
                    </Animated.View>
                  }
                />
                <Animated.View
                  style={[
                    styles.submenuContainer,
                    {
                      opacity,
                      transform: [{ translateY }],
                      height: isStatsOpen ? 'auto' : 0,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {STATISTICS_ROUTES.map((route) => {
                    const subRouteIndex = props.state.routeNames.indexOf(route.name);
                    const isSubFocused = subRouteIndex === props.state.index;

                    return (
                      <DrawerItem
                        key={route.name}
                        icon={route.icon as keyof typeof Ionicons.glyphMap}
                        label={route.label}
                        isActive={isSubFocused}
                        onPress={() => handleNavigation(route.name)}
                      />
                    );
                  })}
                </Animated.View>
              </View>
            );
          }

          return (
            <DrawerItem
              key={item.name}
              icon={item.icon}
              label={item.label}
              isActive={isFocused}
              onPress={() => props.navigation.navigate(item.name)}
            />
          );
        })}
      </View>
      
      {/* Logout Button */}
      <View style={styles.footerContainer}>
        <DrawerItem
          icon="log-out-outline"
          label="Chiqish"
          onPress={handleLogout}
        />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  headerContainer: {
    padding: 24,
    backgroundColor: '#2D1B69',
    marginTop: -4,
    marginBottom: 16,
    borderBottomRightRadius: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    elevation: 4,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  adminName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  adminRole: {
    color: '#fff',
    opacity: 0.8,
    fontSize: 14,
  },
  menuContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  menuItem: {
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  } as any,
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  menuLabelActive: {
    color: '#fff',
  },
  menuItemActive: {
    backgroundColor: '#2D1B69',
  },
  submenuContainer: {
    marginLeft: 24,
    marginTop: 4,
    marginBottom: 4,
  },
  footerContainer: {
    marginTop: 'auto',
    marginBottom: 40,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
});

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!token && pathname !== '/login') {
        console.log('No token found, redirecting to login...');
        router.replace('/login');
      } else if (token && pathname === '/login') {
        console.log('User already logged in, redirecting to home...');
        router.replace('/');
      }
    }
  }, [token, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2D1B69" />
      </View>
    );
  }

  if (!token && pathname !== '/login') {
    return null; // Prevents flash of protected content before redirect
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isWeb = Platform.OS === 'web';
  const pathname = usePathname();

  // Close drawer when clicking outside on web
  useEffect(() => {
    if (!isWeb) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const drawerElement = document.querySelector('[data-testid=drawer]');
      const hamburgerButton = document.querySelector('[data-testid=hamburger-button]');
      
      if (isDrawerOpen && 
          drawerElement && 
          !drawerElement.contains(event.target as Node) &&
          hamburgerButton &&
          !hamburgerButton.contains(event.target as Node)) {
        setIsDrawerOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWeb, isDrawerOpen]);
  
  // Close drawer when route changes
  useEffect(() => {
    if (!isWeb) return;
    setIsDrawerOpen(false);
  }, [pathname, isWeb]);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProtectedRoute>
          <Drawer
          screenOptions={{
            headerShown: true,
            headerStyle: {
              backgroundColor: '#2D1B69',
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18,
            },
            headerLeft: () => {
              const navigation = useNavigation();
              return (
                <TouchableOpacity 
                  onPress={() => {
                    if (isWeb) {
                      setIsDrawerOpen(!isDrawerOpen);
                    } else {
                      // @ts-ignore - openDrawer is available on the navigation object
                      navigation.openDrawer();
                    }
                  }}
                  style={{ marginLeft: 15, padding: 10 }}
                  data-testid="hamburger-button"
                >
                  <Ionicons name="menu" size={28} color="#fff" />
                </TouchableOpacity>
              );
            },
            drawerStyle: [
              {
                backgroundColor: '#fff',
                width: 300,
                borderTopRightRadius: 24,
                borderBottomRightRadius: 24,
                paddingTop: Platform.OS === 'android' ? 16 : 0,
              },
              ...(isWeb ? [{
                marginTop: 0,
                height: '100%',
                position: 'absolute',
                transform: [
                  { translateX: isDrawerOpen ? 0 : -320 }
                ],
                zIndex: 1000,
              }] : [])
            ],
            drawerType: 'front',
            drawerHideStatusBarOnOpen: true,
            drawerActiveBackgroundColor: '#2D1B69',
            drawerActiveTintColor: '#fff',
            drawerInactiveTintColor: '#333',
            overlayColor: isWeb ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
            swipeEnabled: true,
            drawerPosition: 'left',
            drawerStatusBarAnimation: 'slide',
          }}
          drawerContent={(props) => (
            <View testID="drawer" style={{ flex: 1 }}>
              <CustomDrawerContent {...props} onClose={() => {
                if (isWeb) {
                  setIsDrawerOpen(false);
                } else {
                  // @ts-ignore - navigation prop is available in the drawer content
                  props.navigation.closeDrawer();
                }
              }} />
            </View>
          )}
        >
          <Drawer.Screen
            name="login"
            options={{
              headerShown: false,
              swipeEnabled: false,
              drawerItemStyle: { display: 'none' },
            }}
          />
          {MENU_ITEMS.map((item) => (
            <Drawer.Screen
              key={item.name}
              name={item.name}
              options={{
                title: item.label,
              }}
            />
          ))}
          {STATISTICS_ROUTES.map((route) => (
            <Drawer.Screen
              key={route.name}
              name={route.name}
              options={{
                title: route.label,
              }}
            />
          ))}
          </Drawer>
        </ProtectedRoute>
      </AuthProvider>
    </SafeAreaProvider>
  );
}