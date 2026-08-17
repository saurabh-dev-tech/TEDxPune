import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, Fonts } from '@/constants/theme';
import { Avatar } from '@/components/tedx/avatar';
import { MaxWidthContainer } from '@/components/tedx/max-width-container';
import { NotificationsApi, AppNotification } from '@/lib/api/notifications';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getNotificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'announcement':
      return { icon: 'megaphone-outline' as const, bg: '#FEF2F2', color: C.red };
    case 'kudos':
      return { icon: 'thumbs-up-outline' as const, bg: '#EFF6FF', color: '#2563EB' };
    case 'comment':
      return { icon: 'chatbubble-ellipses-outline' as const, bg: '#F0FDF4', color: '#16A34A' };
    case 'talk':
      return { icon: 'mic-outline' as const, bg: '#FAF5FF', color: '#9333EA' };
    case 'system':
    default:
      return { icon: 'notifications-outline' as const, bg: '#F3F4F6', color: C.slate };
  }
}

type FilterType = 'all' | 'unread' | 'announcement';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await NotificationsApi.list();
      setNotifications(data);
    } catch (err) {
      console.warn('[NotificationsScreen] Error loading notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    await NotificationsApi.markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await NotificationsApi.markAllAsRead();
  };

  const filteredNotifications = notifications.filter(item => {
    if (activeFilter === 'unread') return !item.read;
    if (activeFilter === 'announcement') return item.type === 'announcement';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      <MaxWidthContainer style={{ backgroundColor: C.paper }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSub}>{unreadCount} unread</Text>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} activeOpacity={0.7}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'unread', 'announcement'] as FilterType[]).map(filter => {
            const label =
              filter === 'all'
                ? 'All'
                : filter === 'unread'
                ? `Unread (${unreadCount})`
                : 'Announcements';
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={C.red} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={C.red}
              />
            }
          >
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="notifications-off-outline" size={48} color={C.faint} />
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptyBody}>
                  {activeFilter === 'unread'
                    ? "You're all caught up! No unread notifications."
                    : 'When you get notifications, they will show up here.'}
                </Text>
              </View>
            ) : (
              filteredNotifications.map(item => {
                const iconInfo = getNotificationIcon(item.type);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleMarkAsRead(item.id)}
                    activeOpacity={0.8}
                    style={[styles.itemCard, !item.read && styles.itemCardUnread]}
                  >
                    {/* Icon or Avatar */}
                    {item.authorName ? (
                      <Avatar name={item.authorName} size={42} />
                    ) : (
                      <View style={[styles.iconBadge, { backgroundColor: iconInfo.bg }]}>
                        <Ionicons name={iconInfo.icon} size={20} color={iconInfo.color} />
                      </View>
                    )}

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <View style={styles.itemMetaRow}>
                        <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.itemBody}>{item.body}</Text>
                    </View>

                    {/* Unread Red Dot */}
                    {!item.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    color: C.ink,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: C.red,
    marginTop: 2,
  },
  markAllText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: C.red,
    fontWeight: '600',
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.mist,
  },
  filterChipActive: {
    backgroundColor: C.ink,
  },
  filterText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: C.slate,
  },
  filterTextActive: {
    color: C.paper,
    fontWeight: '600',
  },

  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    color: C.ink,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
    backgroundColor: C.paper,
  },
  itemCardUnread: {
    backgroundColor: '#FEF2F3',
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    color: C.ink,
    flex: 1,
    marginRight: 8,
  },
  itemTitleUnread: {
    fontWeight: '700',
  },
  itemTime: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.slate,
  },
  itemBody: {
    fontSize: 13,
    color: C.slate,
    lineHeight: 19,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.red,
    marginTop: 4,
  },
});
