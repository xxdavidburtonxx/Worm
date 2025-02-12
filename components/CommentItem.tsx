import { View, Text, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { CachedImage } from './CachedImage';
import type { Comment } from '@/components/types';

interface CommentItemProps {
  comment: Comment;
}

export function CommentItem({ comment }: CommentItemProps) {
  return (
    <View style={styles.container}>
      <CachedImage
        uri={comment.user.avatar_url || "https://via.placeholder.com/40"}
        style={styles.avatar}
      />
      <View style={styles.content}>
        <Text style={styles.name}>{comment.user.name}</Text>
        <Text style={styles.text}>{comment.text}</Text>
        <Text style={styles.time}>
          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
}); 