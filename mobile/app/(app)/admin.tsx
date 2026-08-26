import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { getStoredToken } from '../../services/api';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { ChevronLeft, ChevronRight, RotateCw, LayoutDashboard } from 'lucide-react-native';

export default function AdminScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    async function loadAuth() {
      const storedToken = await getStoredToken();
      setToken(storedToken);
    }
    loadAuth();
  }, []);

  // Injetar token no localStorage do frontend web
  const injectedJavaScript = token
    ? `
      try {
        localStorage.setItem('@viggo:token', '${token}');
      } catch (e) {}
      true;
    `
    : '';

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navControls}>
          <TouchableOpacity
            style={[styles.navBtn, !canGoBack && styles.navBtnDisabled]}
            onPress={() => webViewRef.current?.goBack()}
            disabled={!canGoBack}
          >
            <ChevronLeft size={20} color={canGoBack ? Colors.text : Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
            onPress={() => webViewRef.current?.goForward()}
            disabled={!canGoForward}
          >
            <ChevronRight size={20} color={canGoForward ? Colors.text : Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => webViewRef.current?.reload()}
          >
            <RotateCw size={16} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.titleContainer}>
          <LayoutDashboard size={16} color={Colors.primary} />
          <Text style={styles.titleText}>Painel Admin</Text>
        </View>
      </View>

      {token && (
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://viggo.fragata.me/admin/dashboard' }}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    paddingTop: 44,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceCard,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
