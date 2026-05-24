import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal, StatusBar, Keyboard,
  Animated as RNAnimated, Pressable, Dimensions,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const C = {
  orange:  '#FF6B2C',
  peach:   '#FFE0CC',
  cream:   '#FFF5EE',
  night:   '#1A1A2E',
  muted:   '#5A5A7A',
  hint:    '#BEBEBE',
  border:  '#EBEBEB',
  lightBg: '#F7F7FA',
};

const SCREEN_WIDTH = Dimensions.get('window').width;

/* ─── Typing Indicator Dots Animation ─── */
function TypingDots() {
  const dot1 = useRef(new RNAnimated.Value(0)).current;
  const dot2 = useRef(new RNAnimated.Value(0)).current;
  const dot3 = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          RNAnimated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (dot) => ({
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.muted,
    marginHorizontal: 2,
    transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
  });

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        <RNAnimated.View style={dotStyle(dot1)} />
        <RNAnimated.View style={dotStyle(dot2)} />
        <RNAnimated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { match, userName, userType } = route.params || {};
  const isEmployer = userType === 'employer';
  const matchId = match?.match_id;

  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const swipeableRefs = useRef({});

  // Core state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Reply state
  const [replyTo, setReplyTo] = useState(null);

  // Long-press context menu
  const [menuMsg, setMenuMsg] = useState(null); // the message being acted on
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  // Typing indicators
  const [remoteIsTyping, setRemoteIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const lastTypingBroadcast = useRef(0);
  const channelRef = useRef(null);

  // Call scheduling (employer only)
  const [callDate, setCallDate] = useState(match?.call_date || null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleInput, setScheduleInput] = useState('');

  // Determine names
  const jobTitle = match?.jobs?.role ?? 'Role';
  const companyName = match?.jobs?.company ?? 'Company';
  const candidateName = match?.candidate_name ?? 'Candidate';
  const recipientName = isEmployer ? candidateName : companyName;

  // Quick lookup for reply references
  const msgMap = useMemo(() => {
    const map = {};
    messages.forEach((m) => { map[m.id] = m; });
    return map;
  }, [messages]);

  // ── Fetch messages ──
  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data ?? []);
    } catch (err) {
      console.warn('[ChatScreen] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // ── Realtime: postgres_changes + broadcast typing ──
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`room:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        if (payload.new.sender_type !== userType) setRemoteIsTyping(false);
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.sender !== userType) {
          setRemoteIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setRemoteIsTyping(false), 3000);
        }
      })
      .subscribe();

    channelRef.current = channel;

    // Fetch fresh call date
    supabase.from('matches').select('call_date').eq('match_id', matchId).single()
      .then(({ data }) => { if (data?.call_date) setCallDate(data.call_date); });

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [matchId, fetchMessages, userType]);

  // Auto scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // Keyboard scroll
  useEffect(() => {
    const sub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => { if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: true }); }
    );
    return () => sub.remove();
  }, [messages]);

  // ── Broadcast typing (throttled 2s) ──
  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;
    channelRef.current?.send({
      type: 'broadcast', event: 'typing',
      payload: { sender: userType },
    });
  }, [userType]);

  const handleTextChange = useCallback((text) => {
    setInputText(text);
    if (text.trim().length > 0) broadcastTyping();
  }, [broadcastTyping]);

  // ── Send message ──
  const handleSend = async () => {
    if (!inputText.trim()) return;
    const typedText = inputText.trim();
    const replyId = replyTo?.id || null;
    setInputText('');
    setReplyTo(null);
    setSending(true);

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      match_id: matchId,
      sender_type: userType,
      text: typedText,
      reply_to: replyId,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const payload = { match_id: matchId, sender_type: userType, text: typedText };
      if (replyId) payload.reply_to = replyId;

      const { data, error } = await supabase.from('messages').insert(payload).select();
      if (error) throw error;
      if (data?.[0]) {
        setMessages((prev) => prev.map((msg) => (msg.id === optimisticMsg.id ? data[0] : msg)));
      }
    } catch (err) {
      Alert.alert('Send failed', err.message);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMsg.id));
      setInputText(typedText);
    } finally {
      setSending(false);
    }
  };

  // ── Delete message ──
  const handleDeleteMessage = async (msgId) => {
    setMenuMsg(null);
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          // Optimistic remove
          setMessages((prev) => prev.filter((m) => m.id !== msgId));
          try {
            const { error } = await supabase.from('messages').delete().eq('id', msgId);
            if (error) throw error;
          } catch (err) {
            Alert.alert('Delete failed', err.message);
            fetchMessages(); // Re-fetch to restore
          }
        },
      },
    ]);
  };

  // ── Schedule call (employer only) ──
  const handleScheduleConfirm = async () => {
    if (!scheduleInput.trim()) {
      Alert.alert('Date Required', 'Please enter a date and time for the call.');
      return;
    }
    const dateText = scheduleInput.trim();
    setShowScheduleModal(false);
    setScheduleInput('');

    try {
      const { error: matchError } = await supabase
        .from('matches').update({ call_date: dateText }).eq('match_id', matchId);
      if (matchError) throw matchError;
      setCallDate(dateText);

      await supabase.from('messages').insert({
        match_id: matchId, sender_type: 'system',
        text: `📞 Call scheduled for ${dateText}`,
      });
    } catch (err) {
      Alert.alert('Scheduling failed', err.message);
    }
  };

  // ── Swipe-to-reply ──
  const handleSwipeReply = (msg) => {
    setReplyTo({ id: msg.id, text: msg.text, sender_type: msg.sender_type });
    swipeableRefs.current[msg.id]?.close();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const renderLeftActions = (progress) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1], outputRange: [-60, 0],
    });
    return (
      <RNAnimated.View style={[styles.swipeAction, { transform: [{ translateX }] }]}>
        <Text style={styles.swipeActionText}>↩️</Text>
        <Text style={styles.swipeActionLabel}>Reply</Text>
      </RNAnimated.View>
    );
  };

  // ── Long-press handler ──
  const handleLongPress = (msg, evt) => {
    // Don't allow long-press on system messages
    if (msg.sender_type === 'system') return;
    const { pageY } = evt.nativeEvent;
    setMenuMsg(msg);
    setMenuPos({ x: SCREEN_WIDTH / 2, y: pageY });
  };

  // ── Render message bubble ──
  const renderMessageItem = ({ item }) => {
    if (item.sender_type === 'system') {
      return (
        <View style={styles.systemMsgRow}>
          <View style={styles.systemMsgBubble}>
            <Text style={styles.systemMsgText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    const isMine = item.sender_type === userType;
    const repliedMsg = item.reply_to ? msgMap[item.reply_to] : null;

    const bubble = (
      <Pressable
        onLongPress={(evt) => handleLongPress(item, evt)}
        delayLongPress={400}
        style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}
      >
        <View
          style={[
            styles.msgBubble,
            isMine ? styles.msgBubbleRight : styles.msgBubbleLeft,
          ]}
        >
          {/* Reply quote */}
          {repliedMsg && (
            <View style={[
              styles.replyQuote,
              isMine ? styles.replyQuoteMine : styles.replyQuoteTheirs,
            ]}>
              <Text style={[styles.replyQuoteSender, isMine && { color: 'rgba(255,255,255,0.8)' }]}>
                {repliedMsg.sender_type === userType ? 'You' : recipientName}
              </Text>
              <Text
                style={[styles.replyQuoteText, isMine && { color: 'rgba(255,255,255,0.7)' }]}
                numberOfLines={2}
              >
                {repliedMsg.text}
              </Text>
            </View>
          )}

          <Text style={[styles.msgText, isMine ? styles.msgTextRight : styles.msgTextLeft]}>
            {item.text}
          </Text>
          <Text style={[styles.msgTime, isMine ? styles.msgTimeRight : styles.msgTimeLeft]}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      </Pressable>
    );

    return (
      <Swipeable
        ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={() => handleSwipeReply(item)}
        overshootLeft={false}
        friction={2}
        leftThreshold={40}
      >
        {bubble}
      </Swipeable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
    >
      <StatusBar barStyle="dark-content" />

      {/* Custom Navigation Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{recipientName}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{jobTitle}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Scheduled Call Info Bar — always visible, but only employer can change */}
      <View style={styles.callBar}>
        <View style={styles.callBarInfo}>
          <Text style={styles.callBarLabel}>CALL SCHEDULE</Text>
          <Text style={styles.callBarValue}>
            {callDate ? `📞 ${callDate}` : '📅 No call scheduled yet'}
          </Text>
        </View>
        {isEmployer && (
          <TouchableOpacity
            onPress={() => {
              setScheduleInput(callDate || '');
              setShowScheduleModal(true);
            }}
            style={styles.callBarBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.callBarBtnText}>
              {callDate ? 'Reschedule' : 'Set Call'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages Feed */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={C.orange} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onLayout={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListFooterComponent={remoteIsTyping ? <TypingDots /> : null}
        />
      )}

      {/* Reply Preview Bar */}
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarAccent} />
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarSender}>
              Replying to {replyTo.sender_type === userType ? 'yourself' : recipientName}
            </Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyTo.text}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setReplyTo(null)}
            style={styles.replyBarClose}
            activeOpacity={0.7}
          >
            <Text style={styles.replyBarCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {isEmployer && (
          <TouchableOpacity
            style={styles.scheduleIconBtn}
            onPress={() => {
              setScheduleInput(callDate || '');
              setShowScheduleModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.scheduleIcon}>📅</Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.textInput}
          placeholder={replyTo ? 'Type your reply...' : 'Type your message...'}
          placeholderTextColor={C.hint}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
          maxHeight={100}
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          style={[
            styles.sendBtn,
            (!inputText.trim() || sending) && styles.sendBtnDisabled,
          ]}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Long-press Context Menu Modal ── */}
      <Modal
        visible={!!menuMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuMsg(null)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuMsg(null)}>
          <View style={[styles.menuCard, {
            top: Math.min(menuPos.y - 60, Dimensions.get('window').height - 200),
          }]}>
            {/* Reply */}
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                setReplyTo({ id: menuMsg.id, text: menuMsg.text, sender_type: menuMsg.sender_type });
                setMenuMsg(null);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
              }}
            >
              <Text style={styles.menuItemIcon}>↩️</Text>
              <Text style={styles.menuItemText}>Reply</Text>
            </TouchableOpacity>

            {/* Delete — only for own messages */}
            {menuMsg?.sender_type === userType && (
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => handleDeleteMessage(menuMsg.id)}
              >
                <Text style={styles.menuItemIcon}>🗑️</Text>
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete</Text>
              </TouchableOpacity>
            )}

            {/* Cancel */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => setMenuMsg(null)}
            >
              <Text style={styles.menuItemIcon}>✕</Text>
              <Text style={[styles.menuItemText, { color: C.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Schedule Call Modal — employer only */}
      {isEmployer && (
        <Modal
          visible={showScheduleModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowScheduleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Schedule a Call 📞</Text>
              <Text style={styles.modalDesc}>
                Propose a date and time for a call. This will show up at the top of the chat and insert a notice.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. May 28 at 3:00 PM"
                placeholderTextColor={C.hint}
                value={scheduleInput}
                onChangeText={setScheduleInput}
                autoFocus
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  onPress={() => setShowScheduleModal(false)}
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleScheduleConfirm}
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnConfirmText}>Save Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream,
  },
  backBtnText: { fontSize: 20, fontWeight: '800', color: C.orange, marginTop: -2 },
  headerInfo: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.night },
  headerSubtitle: { fontSize: 11, color: C.orange, fontWeight: '600', marginTop: 1 },

  // Call Bar
  callBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)',
    shadowColor: C.night, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.015, shadowRadius: 4, elevation: 1,
  },
  callBarInfo: { flex: 1, gap: 2 },
  callBarLabel: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 0.6 },
  callBarValue: { fontSize: 13, fontWeight: '700', color: C.night },
  callBarBtn: { backgroundColor: C.orange, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  callBarBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Messages
  listContent: { paddingHorizontal: 16, paddingVertical: 16, gap: 6 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Bubbles
  msgRow: { flexDirection: 'row', width: '100%', marginVertical: 3 },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  msgBubble: {
    maxWidth: '75%', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, gap: 4,
    shadowColor: C.night, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02, shadowRadius: 4, elevation: 1,
  },
  msgBubbleLeft: {
    backgroundColor: '#fff', borderTopLeftRadius: 4,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)',
  },
  msgBubbleRight: { backgroundColor: C.orange, borderTopRightRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextLeft: { color: C.night },
  msgTextRight: { color: '#fff' },
  msgTime: { fontSize: 8, alignSelf: 'flex-end', marginTop: 2 },
  msgTimeLeft: { color: C.hint },
  msgTimeRight: { color: 'rgba(255,255,255,0.7)' },

  // Reply quote inside bubble
  replyQuote: { borderRadius: 10, padding: 8, marginBottom: 4, borderLeftWidth: 3 },
  replyQuoteMine: { backgroundColor: 'rgba(255,255,255,0.15)', borderLeftColor: 'rgba(255,255,255,0.5)' },
  replyQuoteTheirs: { backgroundColor: 'rgba(0,0,0,0.04)', borderLeftColor: C.orange },
  replyQuoteSender: { fontSize: 10, fontWeight: '800', color: C.orange, marginBottom: 2 },
  replyQuoteText: { fontSize: 12, color: C.muted, lineHeight: 16 },

  // System messages
  systemMsgRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginVertical: 4 },
  systemMsgBubble: {
    backgroundColor: 'rgba(26,26,46,0.05)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(26,26,46,0.03)',
  },
  systemMsgText: { fontSize: 11, fontWeight: '700', color: C.muted, textAlign: 'center' },

  // Swipe action
  swipeAction: { width: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  swipeActionText: { fontSize: 20 },
  swipeActionLabel: { fontSize: 9, fontWeight: '700', color: C.muted, marginTop: 2 },

  // Typing indicator
  typingRow: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 4, paddingVertical: 4 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)',
  },

  // Reply preview bar
  replyBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  replyBarAccent: {
    width: 3, height: '100%', minHeight: 30,
    backgroundColor: C.orange, borderRadius: 2, marginRight: 10,
  },
  replyBarContent: { flex: 1 },
  replyBarSender: { fontSize: 11, fontWeight: '800', color: C.orange, marginBottom: 1 },
  replyBarText: { fontSize: 12, color: C.muted, lineHeight: 16 },
  replyBarClose: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.lightBg, alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  replyBarCloseText: { fontSize: 13, fontWeight: '700', color: C.muted },

  // Input Bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', gap: 8,
  },
  scheduleIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center',
  },
  scheduleIcon: { fontSize: 18 },
  textInput: {
    flex: 1, backgroundColor: C.lightBg, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    fontSize: 14, color: C.night, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: C.orange, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.peach },
  sendBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Long-press context menu ──
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menuCard: {
    position: 'absolute',
    left: 40, right: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: C.night,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  menuItemIcon: { fontSize: 18 },
  menuItemText: { fontSize: 15, fontWeight: '700', color: C.night },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    width: '100%', maxWidth: 340, gap: 16,
    shadowColor: C.night, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: C.night },
  modalDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
  modalInput: {
    backgroundColor: C.lightBg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, color: C.night, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.03)',
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: C.lightBg },
  modalBtnCancelText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  modalBtnConfirm: { backgroundColor: C.orange },
  modalBtnConfirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
