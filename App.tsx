import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

type Fix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  timestamp: number;
};

const MAX_HISTORY = 100;

export default function App() {
  return (
    <SafeAreaProvider>
      <Tracker />
    </SafeAreaProvider>
  );
}

function Tracker() {
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [history, setHistory] = useState<Fix[]>([]);
  const subscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => () => subscription.current?.remove(), []);

  async function start() {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      setError('Location permission was denied.');
      return;
    }
    setPermissionDenied(false);

    try {
      subscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        ({ coords, timestamp }) => {
          const fix: Fix = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            altitude: coords.altitude,
            speed: coords.speed,
            timestamp,
          };
          setHistory((prev) => [fix, ...prev].slice(0, MAX_HISTORY));
        },
        (reason) => setError(reason),
      );
      setTracking(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function stop() {
    subscription.current?.remove();
    subscription.current = null;
    setTracking(false);
  }

  const current = history[0];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>GPS Tracker</Text>

      <View style={styles.card}>
        {current ? (
          <>
            <Text style={styles.label}>Latitude</Text>
            <Text style={styles.coord}>{current.latitude.toFixed(6)}</Text>
            <Text style={styles.label}>Longitude</Text>
            <Text style={styles.coord}>{current.longitude.toFixed(6)}</Text>
            <View style={styles.metaRow}>
              <Meta label="Accuracy" value={format(current.accuracy, 'm', 1)} />
              <Meta label="Altitude" value={format(current.altitude, 'm', 1)} />
              <Meta label="Speed" value={format(current.speed, 'm/s', 1)} />
            </View>
            <Text style={styles.timestamp}>
              Updated {new Date(current.timestamp).toLocaleTimeString()}
            </Text>
          </>
        ) : (
          <Text style={styles.placeholder}>
            {tracking ? 'Waiting for GPS fix…' : 'Tap Start to begin tracking.'}
          </Text>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {permissionDenied && (
        <Pressable onPress={() => Linking.openSettings()}>
          <Text style={styles.link}>Open Settings</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.button, tracking && styles.buttonStop]}
        onPress={tracking ? stop : start}
      >
        <Text style={styles.buttonText}>{tracking ? 'Stop Tracking' : 'Start Tracking'}</Text>
      </Pressable>

      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>History ({history.length})</Text>
        {history.length > 0 && (
          <Pressable onPress={() => setHistory([])}>
            <Text style={styles.link}>Clear</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={history}
        keyExtractor={(item) => String(item.timestamp)}
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <Text style={styles.historyTime}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
            <Text style={styles.historyCoord}>
              {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function format(value: number | null, unit: string, digits: number) {
  return value == null || value < 0 ? '—' : `${value.toFixed(digits)} ${unit}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '700', marginVertical: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    minHeight: 200,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  coord: { fontSize: 32, fontWeight: '600', fontVariant: ['tabular-nums'], marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { flex: 1 },
  metaValue: { fontSize: 16, fontWeight: '500', fontVariant: ['tabular-nums'] },
  timestamp: { marginTop: 12, color: '#6b7280', fontSize: 13 },
  placeholder: { textAlign: 'center', color: '#6b7280', fontSize: 16 },
  error: { color: '#b91c1c', marginTop: 12 },
  link: { color: '#2563eb', fontWeight: '600', marginTop: 8 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonStop: { backgroundColor: '#dc2626' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d5db',
  },
  historyTime: { color: '#6b7280', fontVariant: ['tabular-nums'] },
  historyCoord: { fontVariant: ['tabular-nums'] },
});
