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
import { C, Fonts } from '@/constants/theme';
import { Avatar } from '@/components/tedx/avatar';
import { useApi } from '@/lib/hooks/use-api';
import { UsersApi } from '@/lib/api/users';
import type { User } from '@/lib/api/types';

const FILTER_CHIPS = ['All', 'Speakers', 'Attendees', 'Tech', 'Design', 'Climate'];

/**
 * Derive a UI "role" from the headline since the backend's User schema doesn't include one.
 * Keeps the editorial role-badge look from the design.
 */
function inferRole(headline?: string): 'Speaker' | 'Organizer' | 'Attendee' {
  const h = (headline || '').toLowerCase();
  if (h.includes('speaker') || h.includes('tedx')) return 'Speaker';
  if (h.includes('organizer') || h.includes('curator') || h.includes('host')) return 'Organizer';
  return 'Attendee';
}

const roleColor: Record<string, string> = {
  Speaker: C.red,
  Organizer: C.ink,
  Attendee: C.slate,
};

function MemberCard({ member, featured }: { member: User; featured?: boolean }) {
  const role = inferRole(member.headline);
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
        onPress={() => Alert.alert(member.fullName, member.headline ?? 'No headline.')}
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
    const role = inferRole(m.headline);
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
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.faint, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              04 / community
            </Text>
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
          <Text style={{ fontSize: 14, color: C.slate }}>⊞</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {FILTER_CHIPS.map(chip => (
              <TouchableOpacity
                key={chip}
                onPress={() => setActiveFilter(chip)}
                style={[styles.chip, activeFilter === chip && styles.chipActive]}
              >
                <Text style={[styles.chipText, activeFilter === chip && styles.chipTextActive]}>
                  {chip}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: C.slate, letterSpacing: 1, textTransform: 'uppercase', fontFamily: Fonts.mono }}>
          {query || activeFilter !== 'All' ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}` : 'Suggested for you'}
        </Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={{ fontSize: 12, color: C.red, fontWeight: '500' }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.red} />
        }
      >
        {loading && members.length === 0 && (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={C.red} />
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.red, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
              Couldn't load directory
            </Text>
            <Text style={{ fontSize: 13, color: C.slate, marginBottom: 10 }}>{error.message}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
              <Text style={{ color: C.paper, fontSize: 12, fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && filtered.length === 0 && (
          <Text style={{ fontSize: 14, color: C.muted, fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>
            No members match your search.
          </Text>
        )}

        {filtered.map((m, i) => (
          <MemberCard key={m.id} member={m} featured={i === 0 && !query && activeFilter === 'All'} />
        ))}
      </ScrollView>
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
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.red,
    borderRadius: 6,
  },
});
