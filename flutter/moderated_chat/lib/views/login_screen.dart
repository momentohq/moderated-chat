import 'package:flutter/material.dart';
import 'package:moderated_chat/views/chat_screen.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:moderated_chat/widgets/gradient_background.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../providers/chat_message_provider.dart';
import '../services/auth_service.dart';
import '../services/chat_message_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _usernameController = TextEditingController();

  void _submitUsername() async {
    final String username = _usernameController.text;
    if (username.isNotEmpty) {
      final userId = const Uuid().v4();
      final userService = UserService(username, userId);
      _initChatServices(userService);
    }
  }

  Future<void> _initChatServices(UserService userService) async {
    final chatMessageService = await ChatMessageService.create(userService);
    final chatMessageProvider = ChatMessageProvider(chatMessageService);
    chatMessageProvider.loadAndSubscribe();

    // Check if the widget is still mounted before navigating
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
            builder: (context) => ChangeNotifierProvider<ChatMessageProvider>(
                  create: (_) => chatMessageProvider,
                  child: const ChatScreen(),
                )),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          leading: SvgPicture.asset('assets/svg/mochat-mo-peek-up.svg',
              fit: BoxFit.scaleDown),
          title: const Text("Welcome to MoChat",
              style: TextStyle(
                  fontSize: 20, color: Colors.white, fontFamily: 'Manrope')),
          centerTitle: false,
          backgroundColor: const Color.fromARGB(255, 14, 37, 21)),
      body: GradientBackground(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _usernameController,
              decoration: const InputDecoration(
                labelText: 'Choose your username...',
                border: OutlineInputBorder(),
                fillColor: Color.fromARGB(255, 220, 229, 221),
                filled: true,
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
                onPressed: _submitUsername,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color.fromARGB(255, 0, 108, 75),
                ),
                child: const Text('Continue',
                    style: TextStyle(color: Colors.white)))
          ],
        ),
      ),
    );
  }
}
