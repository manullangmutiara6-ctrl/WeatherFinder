import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';

const WEATHER_MAP: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Cerah',              emoji: '☀️' },
  1:  { label: 'Sebagian Cerah',     emoji: '🌤️' },
  2:  { label: 'Berawan Sebagian',   emoji: '⛅' },
  3:  { label: 'Mendung',            emoji: '☁️' },
  45: { label: 'Berkabut',           emoji: '🌫️' },
  48: { label: 'Kabut Beku',         emoji: '🌫️' },
  51: { label: 'Gerimis Ringan',     emoji: '🌦️' },
  53: { label: 'Gerimis Sedang',     emoji: '🌦️' },
  61: { label: 'Hujan Ringan',       emoji: '🌧️' },
  63: { label: 'Hujan Sedang',       emoji: '🌧️' },
  65: { label: 'Hujan Lebat',        emoji: '🌧️' },
  80: { label: 'Hujan Lokal',        emoji: '🌦️' },
  95: { label: 'Badai Petir',        emoji: '⛈️' },
};

function getWeatherInfo(code: number) {
  return WEATHER_MAP[code] ?? { label: 'Tidak Diketahui', emoji: '❓' };
}

function degreesToCompass(deg: number) {
  const dirs = ['U','TL','T','TG','S','BD','B','BL'];
  return dirs[Math.round(deg / 45) % 8];
}

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (searchInput.trim() === '') {
      setStatus('idle');
      setWeatherData(null);
      return;
    }
    const controller = new AbortController();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchWeather(searchInput.trim(), controller.signal);
    }, 500);
    return () => {
      clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [searchInput]);

  async function fetchWeather(cityName: string, signal: AbortSignal) {
    setStatus('loading');
    setWeatherData(null);
    setErrorMsg('');
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=id`,
        { signal }
      );
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        setErrorMsg(`Kota "${cityName}" tidak ditemukan.`);
        setStatus('error');
        return;
      }
      const { latitude, longitude, name, country } = geoData.results[0];
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
        { signal }
      );
      const weatherJson = await weatherRes.json();
      const cw = weatherJson.current_weather;
      setWeatherData({
        city: name, country,
        temperature: Math.round(cw.temperature),
        windspeed: cw.windspeed,
        winddir: cw.winddirection,
        weathercode: cw.weathercode,
        isDay: cw.is_day,
        tempMax: Math.round(weatherJson.daily.temperature_2m_max[0]),
        tempMin: Math.round(weatherJson.daily.temperature_2m_min[0]),
      });
      setStatus('success');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMsg('Gagal mengambil data. Cek koneksi internet kamu.');
      setStatus('error');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.appTitle}>🌤️ WeatherFinder</Text>
        <Text style={styles.appSubtitle}>Cari cuaca kota manapun</Text>
        <TextInput
          style={styles.input}
          placeholder="Ketik nama kota... (cth: Jakarta)"
          placeholderTextColor="#999"
          value={searchInput}
          onChangeText={setSearchInput}
          autoCapitalize="words"
        />
        {status === 'idle' && (
          <View style={styles.hintBox}>
            <Text style={styles.hintEmoji}>🔍</Text>
            <Text style={styles.hintText}>Ketik nama kota untuk melihat cuaca</Text>
          </View>
        )}
        {status === 'loading' && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Mencari cuaca...</Text>
          </View>
        )}
        {status === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
        {status === 'success' && weatherData && (
          <View style={[styles.card, { backgroundColor: weatherData.isDay === 1 ? '#EFF6FF' : '#1E293B' }]}>
            <Text style={styles.dayNight}>{weatherData.isDay === 1 ? '☀️ Siang' : '🌙 Malam'}</Text>
            <Text style={[styles.cityName, { color: weatherData.isDay === 1 ? '#1E3A5F' : '#E2E8F0' }]}>
              {weatherData.city}
            </Text>
            <Text style={[styles.countryName, { color: weatherData.isDay === 1 ? '#1E3A5F' : '#E2E8F0' }]}>
              {weatherData.country}
            </Text>
            <Text style={[styles.tempBig, { color: weatherData.isDay === 1 ? '#1E3A5F' : '#E2E8F0' }]}>
              {weatherData.temperature}°C
            </Text>
            <Text style={styles.weatherEmoji}>{getWeatherInfo(weatherData.weathercode).emoji}</Text>
            <Text style={[styles.weatherLabel, { color: weatherData.isDay === 1 ? '#1E3A5F' : '#E2E8F0' }]}>
              {getWeatherInfo(weatherData.weathercode).label}
            </Text>
            <View style={styles.minMaxRow}>
              <Text style={[styles.minMaxText, { color: weatherData.isDay === 1 ? '#1E3A5F' : '#E2E8F0' }]}>
                ↓ {weatherData.tempMin}°C  |  ↑ {weatherData.tempMax}°C
              </Text>
            </View>
            <Text style={[styles.windText, { color: weatherData.isDay === 1 ? '#1E3A5F' : '#E2E8F0' }]}>
              💨 {weatherData.windspeed} km/j · {degreesToCompass(weatherData.winddir)} ({weatherData.winddir}°)
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: '#F8FAFC' },
  container:    { padding: 20, paddingTop: 40, alignItems: 'center' },
  appTitle:     { fontSize: 28, fontWeight: '800', color: '#1E3A5F', marginBottom: 4 },
  appSubtitle:  { fontSize: 14, color: '#64748B', marginBottom: 24 },
  input: {
    width: '100%', height: 50, borderRadius: 12,
    backgroundColor: '#fff', paddingHorizontal: 16,
    fontSize: 16, color: '#1E293B',
    borderWidth: 1, borderColor: '#CBD5E1', elevation: 2,
  },
  hintBox:      { marginTop: 60, alignItems: 'center' },
  hintEmoji:    { fontSize: 48, marginBottom: 12 },
  hintText:     { fontSize: 15, color: '#94A3B8', textAlign: 'center' },
  loadingBox:   { marginTop: 60, alignItems: 'center' },
  loadingText:  { marginTop: 12, fontSize: 15, color: '#64748B' },
  errorBox: {
    marginTop: 30, width: '100%', padding: 16,
    backgroundColor: '#FEE2E2', borderRadius: 12,
    borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center',
  },
  errorEmoji:   { fontSize: 32, marginBottom: 8 },
  errorText:    { fontSize: 14, color: '#991B1B', textAlign: 'center' },
  card: {
    marginTop: 24, width: '100%', borderRadius: 20,
    padding: 24, alignItems: 'center', elevation: 4,
  },
  dayNight:     { fontSize: 13, color: '#64748B', marginBottom: 8 },
  cityName:     { fontSize: 26, fontWeight: '700' },
  countryName:  { fontSize: 14, marginBottom: 8, opacity: 0.7 },
  tempBig:      { fontSize: 64, fontWeight: '800', lineHeight: 80 },
  weatherEmoji: { fontSize: 40, marginTop: 4 },
  weatherLabel: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  minMaxRow:    { marginBottom: 8 },
  minMaxText:   { fontSize: 16, fontWeight: '600' },
  windText:     { fontSize: 14, opacity: 0.8 },
});