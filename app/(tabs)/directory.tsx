import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C, Fonts } from '@/constants/theme';
import { Avatar } from '@/components/tedx/avatar';
import { useApi } from '@/lib/hooks/use-api';
import { UsersApi } from '@/lib/api/users';
import type { User } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/context';
import { MaxWidthContainer } from '@/components/tedx/max-width-container';

const FILTER_CHIPS = ['All', 'Speakers', 'Attendees', 'Tech', 'Design', 'Climate'];

/**
 * Derive a UI "role" from the headline since the backend's User schema doesn't include one.
 * Keeps the editorial role-badge look from the design.
 */
function inferRole(headline?: string, explicitRole?: string): 'Speaker' | 'Organizer' | 'Attendee' {
  if (explicitRole) {
    const r = explicitRole.toLowerCase();
    if (r === 'speaker') return 'Speaker';
    if (r === 'organizer' || r === 'admin' || r === 'super_admin' || r === 'curator') return 'Organizer';
    if (r === 'user' || r === 'attendee' || r === 'member') return 'Attendee';
  }
  const h = (headline || '').toLowerCase();
  if (h.includes('speaker')) return 'Speaker';
  if (h.includes('organizer') || h.includes('curator') || h.includes('host')) return 'Organizer';
  return 'Attendee';
}

const roleColor: Record<string, string> = {
  Speaker: C.red,
  Organizer: C.ink,
  Attendee: C.slate,
};

function MemberCard({ member, featured }: { member: User; featured?: boolean }) {
  const router = useRouter();
  const role = inferRole(member.headline, member.role);
  const rc = roleColor[role] ?? C.slate;
  return (
    <View style={[styles.memberCard, featured && styles.featuredBorder]}>
      {featured && <View style={styles.featuredLine} />}
      <Avatar name={member.fullName} size={48} url={member.avatarUrl} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Text style={{ fontWeight: '600', fontSize: 14.5, color: C.ink, flexShrink: 1 }} numberOfLines={1}>
            {member.fullName}
          </Text>
          <View style={[styles.roleBadge, { borderColor: rc === C.slate ? C.hair : rc }]}>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 9, color: rc, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {role}
            </Text>
          </View>
        </View>
        {!!member.headline && (
          <Text style={{ fontSize: 13, color: C.slate, lineHeight: 18, marginBottom: 4 }} numberOfLines={2}>
            {member.headline}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.viewBtn}
        activeOpacity={0.7}
        onPress={() => router.push(`/member/${member.id}`)}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.ink }}>View</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DirectoryScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { user: currentUser } = useAuth();

  const { data, loading, error, refetch } = useApi(
    () => UsersApi.directory(1, 50),
    []
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // useApi tracks the error via `error` state; swallow here to avoid
      // an unhandled-promise warning from RefreshControl.
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const members = data?.data ?? [];

  const filtered = members.filter(m => {
    // Filter out currently logged-in user
    if (currentUser && m.id === currentUser.id) return false;

    const role = inferRole(m.headline, m.role);
    let matchFilter: boolean;
    if (activeFilter === 'All') matchFilter = true;
    else if (activeFilter === 'Speakers') matchFilter = role === 'Speaker';
    else if (activeFilter === 'Attendees') matchFilter = role === 'Attendee';
    else matchFilter = (m.headline || '').toLowerCase().includes(activeFilter.toLowerCase());

    const q = query.trim().toLowerCase();
    const matchQuery =
      q === '' ||
      m.fullName.toLowerCase().includes(q) ||
      (m.headline || '').toLowerCase().includes(q);

    return matchFilter && matchQuery;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      <MaxWidthContainer style={{ backgroundColor: C.paper }}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontFamily: Fonts.serif, fontSize: 28, fontWeight: '400', letterSpacing: -0.6, marginTop: 2, color: C.ink }}>
                Directory
              </Text>
            </View>
            <View style={styles.memberCountBadge}>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 11, color: C.slate }}>
                {data ? `${data.total} members` : '… members'}
              </Text>
            </View>
          </View>

          <View style={styles.searchBar}>
            <Text style={{ fontSize: 16, color: C.muted, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={{ flex: 1, fontSize: 14, color: C.ink }}
              placeholder="Search by name or headline…"
              placeholderTextColor={C.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Text style={{ fontSize: 14, color: C.slate, fontWeight: '500' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 2 }}>
              {FILTER_CHIPS.map(chip => {
                const active = activeFilter === chip;
                return (
                  <TouchableOpacity
                    key={chip}
                    onPress={() => setActiveFilter(chip)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.red} />}
        >
          {/* Loading */}
          {loading && members.length === 0 && (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator color={C.red} size="large" />
              <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.faint, marginTop: 12, letterSpacing: 1 }}>LOADING…</Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Couldn't load directory</Text>
              <Text style={styles.errorDesc}>{error.message}</Text>
              <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
              <Text style={{ fontFamily: Fonts.serif, fontSize: 18, color: C.ink, marginBottom: 6 }}>No members found</Text>
              <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', paddingHorizontal: 24 }}>
                We couldn't find anyone matching your search or filters. Try adjusting them.
              </Text>
            </View>
          )}

          {/* Grid list */}
          {!loading && filtered.length > 0 && (
            <View style={{ gap: 10 }}>
              {filtered.map(member => (
                <MemberCard key={member.id} member={member} />
              ))}
            </View>
          )}
        </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  memberCountBadge: {
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.mist,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.hair,
  },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 13, fontWeight: '500', color: C.slate },
  chipTextActive: { color: C.paper },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.hair,
  },
  filterChipActive: { backgroundColor: C.ink, borderColor: C.ink },
  filterChipText: { fontSize: 13, fontWeight: '500', color: C.slate },
  filterChipTextActive: { color: C.paper },
  memberCard: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  featuredBorder: { paddingLeft: 17 },
  featuredLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    backgroundColor: C.red,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  viewBtn: {
    alignSelf: 'center',
    height: 32,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.ink,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  errorBox: {
    marginHorizontal: 4,
    marginVertical: 8,
    padding: 16,
    borderRadius: 10,
    backgroundColor: C.redSoft,
    borderWidth: 1,
    borderColor: `${C.red}30`,
    alignItems: 'flex-start',
  },
  errorText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.red,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  errorDesc: {
    fontSize: 13,
    color: C.slate,
    marginBottom: 10,
  },
  retryText: {
    color: C.paper,
    fontSize: 12,
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.red,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
