import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../theme';
import { ConversationItem as ConversationItemType } from '../types';
import { listenConversations } from '../services/chatService';
import { useAuth } from '../context';
import { ConversationItem } from '../components/ConversationItem';

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const [searchText, setSearchText] = useState('');
  const [conversations, setConversations] = useState<ConversationItemType[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }

    // Lắng nghe danh sách cuộc trò chuyện và HỦY trong cleanup
    const unsubscribe = listenConversations(user.uid, convList => {
      setConversations(convList);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const filteredConversations = conversations.filter(c =>
    (c.name || c.recipientName || '')
      .toLowerCase()
      .includes(searchText.toLowerCase()),
  );

  const renderConversation = useCallback(
    ({ item }: { item: ConversationItemType }) => (
      <ConversationItem
        item={item}
        onPress={() => {
          if (item.type === 'group') {
            navigation.navigate('Chat', {
              convId: item.convId,
              chatId: item.convId,
              convType: 'group',
              recipientName: item.name,
              recipientAvatar: item.avatar,
            });
          } else {
            navigation.navigate('Chat', {
              convId: item.convId,
              chatId: item.convId,
              convType: 'direct',
              recipientId: item.recipientId,
              recipientName: item.name || item.recipientName,
              recipientAvatar: item.avatar || item.recipientAvatar,
            });
          }
        }}
      />
    ),
    [navigation],
  );

  return (
    <View style={styles.container}>
      {/* Header với nút Tạo nhóm */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
        <TouchableOpacity
          style={styles.createGroupBtn}
          onPress={() => navigation.navigate('CreateGroup')}
          accessibilityLabel="Tạo nhóm mới">
          <Text style={styles.createGroupText}>➕ Tạo nhóm</Text>
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm cuộc trò chuyện hoặc nhóm..."
          placeholderTextColor={COLORS.gray500}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Danh sách hội thoại */}
      {filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText
              ? 'Không tìm thấy cuộc trò chuyện phù hợp'
              : 'Chưa có cuộc trò chuyện nào'}
          </Text>
          <Text style={styles.emptySubtext}>
            Chuyển qua tab Danh bạ hoặc bấm Tạo nhóm để bắt đầu nhắn tin!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={item => item.convId || item.chatId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  createGroupBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  createGroupText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
  },
});

export default HomeScreen;
