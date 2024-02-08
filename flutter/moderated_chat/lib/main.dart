import 'package:flutter/material.dart';
import 'package:moderated_chat/views/login_screen.dart';

void main() {
  runApp(const ModeratedChatApp());
}

class ModeratedChatApp extends StatelessWidget {
  const ModeratedChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: "Momento Moderated Chat",
      home: LoginScreen(),
    );
  }
}
