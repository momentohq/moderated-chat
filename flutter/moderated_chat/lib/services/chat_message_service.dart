import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:moderated_chat/services/auth_service.dart';
import 'package:momento/momento.dart';

import '../config.dart';
import '../models/chat_message.dart';

class ChatMessageService {
  bool _isActive = true;
  final UserService _userService;
  late TopicClient _topicClient;
  late CacheClient _cacheClient;
  final StreamController<ChatMessage> _messageController =
      StreamController<ChatMessage>.broadcast();
  String _currentLanguage = "en";
  TopicSubscription? _currentSubscription;

  ChatMessageService._(userService) : _userService = userService;

  static Future<ChatMessageService> create(UserService authService) async {
    final service = ChatMessageService._(authService);
    await service._initializeAndScheduleClientRefresh();
    return service;
  }

  Future<void> _initializeAndScheduleClientRefresh() async {
    if (!_isActive) {
      return;
    }
    final (apiToken, expiresAt) = await _userService.getApiToken();
    _topicClient = TopicClient(CredentialProvider.fromString(apiToken),
        TopicClientConfigurations.latest());
    _cacheClient = CacheClient(CredentialProvider.fromString(apiToken),
        CacheClientConfigurations.latest(), const Duration(days: 1));

    final DateTime now = DateTime.now();
    // schedule a refresh 20 seconds before the token expires
    final DateTime refreshTime =
        DateTime.fromMillisecondsSinceEpoch((expiresAt - 20) * 1000);
    final Duration durationUntilRefresh = refreshTime.difference(now);
    print("Time until refresh: $durationUntilRefresh");

    Future.delayed(durationUntilRefresh).then((value) => {
          print("refreshing clients"),
          unsubscribe(),
          subscribe(),
          _initializeAndScheduleClientRefresh()
        });
  }

  Stream<ChatMessage> get messages => _messageController.stream;

  Future<void> changeLanguage(String language) async {
    unsubscribe();
    _currentLanguage = language;
  }

  Future<bool> publishMessage(String message) async {
    final chatUser = _userService.getUser();
    final chatMessage = ChatMessage(DateTime.now().millisecondsSinceEpoch,
        "text", message, _currentLanguage, chatUser.name, chatUser.id);

    final jsonMessage = jsonEncode(chatMessage.toJson());
    print("sending json message: $jsonMessage");
    final result =
        await _topicClient.publish("moderator", "chat-publish", jsonMessage);
    switch (result) {
      case TopicPublishSuccess():
        print("Successful publish");
        return true;
      case TopicPublishError():
        print("Error on publish: ${result.message}");
        return false;
    }
  }

  Future<void> subscribe() async {
    print("Subscribing to chat-$_currentLanguage");

    unsubscribe();

    final subscribeResult =
        await _topicClient.subscribe("moderator", "chat-$_currentLanguage");
    switch (subscribeResult) {
      case TopicSubscription():
        print("Successful subscription");
        _currentSubscription = subscribeResult;
        subscribeResult.stream.listen((item) {
          switch (item) {
            case TopicSubscriptionItemText():
              try {
                final jsonMessage = jsonDecode(item.value);
                final chatMessage = ChatMessage.fromJson(jsonMessage);
                if (chatMessage.messageType == "text") {
                  print(
                      "Received message from stream chat-$_currentLanguage: ${chatMessage.message}");
                } else {
                  print(
                      "Received non-text message from stream chat-$_currentLanguage");
                }
                _messageController.sink.add(chatMessage);
              } catch (e) {
                print("Error parsing message: $e");
              }
              break;
            case TopicSubscriptionItemBinary():
              // ignore binary data
              break;
          }
        });
        break;
      case TopicSubscribeError():
        print("Error: ${subscribeResult.message}");
        break;
    }
  }

  void unsubscribe() {
    if (_currentSubscription != null) {
      _currentSubscription!.unsubscribe();
      _currentSubscription = null;
    }
  }

  Future<void> loadMessages() async {
    final apiUrl =
        "${Config.baseUrl}/v1/translate/latestMessages/$_currentLanguage";
    final response = await http.get(Uri.parse(apiUrl));
    final jsonObject = jsonDecode(utf8.decode(response.bodyBytes));
    final messagesFromJson = jsonObject['messages'];
    for (var i = 0; i < messagesFromJson.length; i++) {
      final message = messagesFromJson[i];
      final chatMessage = ChatMessage.fromJson(message);
      if (chatMessage.messageType == "text") {
        print("Received message from load: ${chatMessage.message}");
      } else {
        print("Received non-text message from load");
      }
      _messageController.sink.add(chatMessage);
    }
  }

  void dispose() {
    _isActive = false;
    _messageController.close();
    _topicClient.close();
    _cacheClient.close();
  }
}
