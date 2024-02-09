import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:image_picker/image_picker.dart';
import 'package:moderated_chat/providers/chat_message_provider.dart';
import 'package:moderated_chat/services/auth_service.dart';
import 'package:moderated_chat/widgets/chat_bubble.dart';
import 'package:moderated_chat/widgets/gradient_background.dart';
import 'package:moderated_chat/widgets/language_dropdown.dart';
import 'package:provider/provider.dart';

class ChatScreen extends StatefulWidget {
  final UserService _userService;

  const ChatScreen({super.key, required UserService userService})
      : _userService = userService;

  final String title = "Flutter Momento Moderated Chat";

  @override
  State<StatefulWidget> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _textInputController = TextEditingController();
  final _scrollController = ScrollController();

  void _submitMessage(ChatMessageProvider messageProvider) async {
    final String message = _textInputController.text;
    if (message.isNotEmpty) {
      messageProvider.publishMessage(message);
      _textInputController.clear();
    }
  }

  void _submitImage(ChatMessageProvider messageProvider) async {
    print("Submitting image");
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      final Uint8List imageBytes = await image.readAsBytes();
      messageProvider.publishImage(imageBytes);
    }
  }

  void _scrollToBottom() {
    final bool isAtBottom =
        _scrollController.offset >= _scrollController.position.maxScrollExtent;
    print("isAtBottom: $isAtBottom");

    if (isAtBottom) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  @override
  void initState() {
    super.initState();
    final messageProvider =
        Provider.of<ChatMessageProvider>(context, listen: false);
    messageProvider.addListener(_scrollToBottom);
  }

  @override
  Widget build(BuildContext context) {
    final messageProvider = Provider.of<ChatMessageProvider>(context);
    return Scaffold(
      appBar: AppBar(
        leading: SvgPicture.asset('assets/svg/mochat-mo-peek-up.svg',
            fit: BoxFit.scaleDown),
        title: const Text("Welcome to MoChat",
            style: TextStyle(
                fontSize: 20, color: Colors.white, fontFamily: 'Manrope')),
        centerTitle: false,
        backgroundColor: const Color.fromARGB(255, 14, 37, 21),
        actions: <Widget>[
          LanguageDropdown(onLanguageChanged: (String language) {
            messageProvider.changeLanguage(language);
          }),
        ],
      ),
      body: GradientBackground(
        child: Center(
          child: Column(
            children: <Widget>[
              Expanded(
                child: Scrollbar(
                    scrollbarOrientation: ScrollbarOrientation.right,
                    controller: _scrollController,
                    child: ListView.builder(

                      controller: _scrollController,
                      physics: const AlwaysScrollableScrollPhysics(),
                      scrollDirection: Axis.vertical,
                      padding: const EdgeInsets.symmetric(horizontal: 50),
                      itemCount: messageProvider.messages.length,
                      itemBuilder: (context, index) {
                        return ChatBubble(
                            message: messageProvider.messages[index],
                            currentUser: widget._userService.getUser());
                      },
                    )),
              ),
              Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                  child: Stack(
                    children: <Widget>[
                      TextField(
                        controller: _textInputController,
                        onSubmitted: (value) => _submitMessage(messageProvider),
                        cursorColor: Colors.white,
                        style: const TextStyle(
                            color: Colors.white, fontFamily: 'Inter'),
                        decoration: InputDecoration(
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          labelText: 'Type your message here',
                          labelStyle: const TextStyle(
                              color: Colors.white, fontFamily: 'Inter'),
                          fillColor: const Color.fromARGB(255, 14, 37, 21),
                          filled: true,
                          focusedBorder: OutlineInputBorder(
                            borderSide: const BorderSide(color: Colors.white),
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                      Positioned(
                        right: 0,
                        top: 0,
                        bottom: 0,
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(
                                Icons.arrow_circle_up,
                                color: Color.fromARGB(255, 196, 241, 53),
                              ),
                              onPressed: () {
                                _submitMessage(messageProvider);
                              },
                              tooltip: "Send message",
                            ),
                            IconButton(
                              icon: const Icon(
                                Icons.image,
                                color: Color.fromARGB(255, 196, 241, 53),
                              ),
                              // Second button
                              onPressed: () {
                                _submitImage(messageProvider);
                              },
                              tooltip: "Send image",
                            ),
                          ],
                        ),
                      ),
                    ],
                  )),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _scrollController.removeListener(_scrollToBottom);
    _textInputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
