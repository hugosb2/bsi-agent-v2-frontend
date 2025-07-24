import React, { useState, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  useColorScheme,
  useWindowDimensions,
  Image
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Markdown from 'react-native-markdown-display';

const BACKEND_URL = 'https://bsi-agent-v2-backend.onrender.com/ask';

interface ColorScheme {
  primary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  textHint: string;
  inputBackground: string;
  borderColor: string;
  statusBar: 'dark-content' | 'light-content';
}

const lightColors: ColorScheme = {
  primary: '#6200EE',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#FFFFFF',
  textHint: '#888888',
  inputBackground: '#F0F0F0',
  borderColor: '#E0E0E0',
  statusBar: 'dark-content',
};

const darkColors: ColorScheme = {
  primary: '#BB86FC',
  background: '#121212',
  surface: '#1E1E1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#000000',
  textHint: '#AAAAAA',
  inputBackground: '#333333',
  borderColor: '#272727',
  statusBar: 'light-content',
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

const SendIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2 .01 7z" fill={color} />
  </Svg>
);

export default function App() {
  const systemTheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  // O tema agora é definido diretamente pelo sistema, com 'light' como padrão
  const theme = systemTheme || 'light'; 
  const colors = useMemo(() => (theme === 'light' ? lightColors : darkColors), [theme]);
  const styles = useMemo(() => createStyles(colors, isDesktop), [colors, isDesktop]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    Keyboard.dismiss();
    const userMessage: Message = { id: Date.now().toString(), text: trimmedText, sender: 'user' };
    
    const currentMessages = messages;

    setMessages(prev => [userMessage, ...prev]);
    setInputText('');
    setIsLoading(true);

    try {
      const conversationHistory = [...currentMessages].reverse();

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: trimmedText,
          history: conversationHistory
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro do Servidor: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      const botResponse: Message = { id: (Date.now() + 1).toString(), text: data.answer, sender: 'bot' };
      setMessages(prev => [botResponse, ...prev]);

    } catch (e: any) {
      console.error("ERRO DETALHADO NO FETCH:", e);
      const errorText = `Falha na comunicação: ${e.message}`;
      const errorResponse: Message = { id: (Date.now() + 1).toString(), text: errorText, sender: 'bot' };
      setMessages(prev => [errorResponse, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUserMessage = item.sender === 'user';
    
    const markdownStyle = {
        body: styles.botMessageText,
        link: {
            color: colors.primary,
            textDecorationLine: 'underline',
        },
        strong: {
            fontWeight: 'bold',
        },
    };

    return (
      <View style={[styles.messageContainer, isUserMessage ? styles.userMessageContainer : styles.botMessageContainer]}>
        {!isUserMessage && (
          <Image source={require('./assets/perfil.png')} style={styles.avatar} />
        )}
        <View style={[styles.messageBubble, isUserMessage ? styles.userMessageBubble : styles.botMessageBubble]}>
          {isUserMessage ? (
            <Text style={styles.userMessageText}>{item.text}</Text>
          ) : (
            <Markdown style={markdownStyle}>{item.text}</Markdown>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.rootContainer}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surface} />
        <View style={styles.appContainer}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Image source={require('./assets/perfil.png')} style={styles.headerAvatar} />
              <View>
                <Text style={styles.headerTitle}>Lívia AI</Text>
                <Text style={styles.headerSubtitle}>Assistente do BSI - IF Baiano</Text>
              </View>
            </View>
            {/* O seletor de tema manual foi removido daqui */}
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              inverted
            />
            {isLoading && (
              <View style={styles.typingIndicatorContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.typingText}>Lívia está digitando...</Text>
              </View>
            )}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Pergunte algo para a Lívia..."
                placeholderTextColor={colors.textHint}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} disabled={isLoading}>
                <SendIcon color={theme === 'dark' ? colors.textSecondary : colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (colors: ColorScheme, isDesktop: boolean) => StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: isDesktop ? 800 : '100%',
  },
  appContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: isDesktop ? 1 : 0,
    borderColor: isDesktop ? colors.borderColor : 'transparent',
    borderRadius: isDesktop ? 8 : 0,
  },
  header: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    borderTopLeftRadius: isDesktop ? 8 : 0,
    borderTopRightRadius: isDesktop ? 8 : 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 68,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: colors.textHint },
  container: { flex: 1, backgroundColor: colors.background },
  chatArea: { flex: 1, paddingHorizontal: 10 },
  chatContent: { paddingVertical: 10 },
  messageContainer: { marginVertical: 5, maxWidth: '80%' },
  userMessageContainer: { alignSelf: 'flex-end' },
  botMessageContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    flexShrink: 1,
  },
  userMessageBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  botMessageBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 5 },
  userMessageText: { color: colors.textSecondary, fontSize: 16 },
  botMessageText: { color: colors.textPrimary, fontSize: 16 },
  typingIndicatorContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  typingText: { marginLeft: 8, color: colors.textHint, fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    borderBottomLeftRadius: isDesktop ? 8 : 0,
    borderBottomRightRadius: isDesktop ? 8 : 0,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 5,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});