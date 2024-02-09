import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:chat_bubbles/chat_bubbles.dart';
import 'package:flutter/material.dart';
import 'package:moderated_chat/models/chat_message.dart';
import 'package:moderated_chat/models/chat_user.dart';
import 'package:uuid/uuid.dart';

class ChatBubble extends StatelessWidget {
  static const Color textColor = Color.fromARGB(255, 37, 57, 43);
  static final List<Color> _iconColors = [
    const Color.fromARGB(255, 194, 178, 169), // squirrel
    const Color.fromARGB(255, 225, 217, 213), // light squirrel
    const Color.fromARGB(255, 234, 248, 182), // light electric
    const Color.fromARGB(255, 171, 231, 210), // light mint
  ];

  final ChatMessage _message;
  final bool _isSender;

  ChatBubble(
      {super.key, required ChatMessage message, required ChatUser currentUser})
      : _message = message,
        _isSender = message.id == currentUser.id;

  CircleAvatar _createChatIcon() {
    final String firstLetter =
        _message.username.isNotEmpty ? _message.username[0].toUpperCase() : "?";

    final int idHash = _message.id.hashCode;
    final random = Random(idHash);
    final int colorIndex = random.nextInt(4);
    final Color iconColor = _iconColors[colorIndex];

    return CircleAvatar(
      backgroundColor: iconColor,
      child: Text(
        firstLetter,
        style: const TextStyle(
            color: textColor,
            backgroundColor: Colors.transparent,
            fontSize: 24,
            fontFamily: 'Inter'),
      ),
    );
  }

  StatelessWidget _createChatBubble() {
    final StatelessWidget bubble;
    if (_message.messageType == "text") {
      bubble = BubbleNormal(
        text: _message.message,
        isSender: _isSender,
        tail: true,
        textStyle: const TextStyle(
            color: textColor, backgroundColor: Colors.transparent),
        color: const Color.fromARGB(255, 0, 200, 140),
      );
    } else if  (_message.messageType == "image") {
      if (_message.message.startsWith("image-")) {
        bubble = BubbleNormal(
          text: "Unable to download image",
          isSender: _isSender,
          tail: true,
          textStyle: const TextStyle(
              color: Colors.yellow,
              backgroundColor: Colors.transparent,
              fontFamily: 'Inter'),
          color: const Color.fromARGB(255, 0, 200, 140),
        );
      } else {
        final Uint8List bytes = base64.decode(_message.message);
        bubble = BubbleNormalImage(
          id: "image-${const Uuid().v4()}",
          image: Image.memory(bytes),
          isSender: _isSender,
          color: const Color.fromARGB(255, 0, 200, 140),
        );
      }
    } else {
      bubble = BubbleNormal(
        text: "Unknown message type",
        isSender: _isSender,
        tail: true,
        textStyle: const TextStyle(
            color: Colors.red,
            backgroundColor: Colors.transparent,
            fontFamily: 'Inter'),
        color: const Color.fromARGB(255, 0, 200, 140),
      );
    }
    return bubble;
  }

  @override
  Widget build(BuildContext context) {
    final CircleAvatar chatIcon = _createChatIcon();
    final Flexible flexibleBubble = Flexible(child: _createChatBubble());

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment:
            _isSender ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: _isSender
            ? [
                flexibleBubble,
                const SizedBox(width: 8),
                chatIcon
              ] // Sender bubble, then icon
            : [
                chatIcon,
                const SizedBox(width: 8),
                flexibleBubble
              ], // Icon, then receiver bubble
      ),
    );
  }
}
