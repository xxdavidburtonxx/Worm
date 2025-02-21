import { Link, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  const pathname = usePathname();
  console.log('Not Found Screen triggered for path:', {
    pathname,
    timestamp: new Date().toISOString(),
    expectedGoalPath: '/goal',
    pathSegments: pathname.split('/'),
    isGoalAttempt: pathname === '/goal'
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>This screen doesn't exist</Text>
      <Text style={styles.subtitle}>Path attempted: {pathname}</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Go to home screen!</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 10,
    color: '#666',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
