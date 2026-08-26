import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { getStoredToken } from '../../services/api';
import { Colors } from '../../constants/theme';

export default function AdminScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      {token && (
        <WebView
          source={{ uri: 'https://viggo.fragata.me' }}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
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
    paddingTop: 40,
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
