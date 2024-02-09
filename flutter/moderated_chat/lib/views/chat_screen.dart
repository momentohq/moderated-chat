import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:moderated_chat/providers/chat_message_provider.dart';
import 'package:moderated_chat/widgets/gradient_background.dart';
import 'package:moderated_chat/widgets/language_dropdown.dart';
import 'package:provider/provider.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

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

  @override
  void initState() {
    super.initState();
    final messageProvider =
        Provider.of<ChatMessageProvider>(context, listen: false);
    messageProvider.addListener(() {
      final bool isAtBottom = _scrollController.offset >=
          _scrollController.position.maxScrollExtent;

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
    });
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
                      shrinkWrap: true,
                      itemCount: messageProvider.messages.length,
                      itemBuilder: (context, index) {
                        return Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              color: const Color.fromARGB(255, 77, 99, 87),
                            ),
                            height: 40,
                            child: Align(
                                alignment: Alignment.centerLeft,
                                child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8.0),
                                    child: Text(
                                      messageProvider.messages[index].message,
                                      style:
                                          const TextStyle(color: Colors.white),
                                    ))));
                      },
                    )),
              ),
              const Divider(),
              Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 50),
                  child: TextField(
                    controller: _textInputController,
                    onSubmitted: (value) => _submitMessage(messageProvider),
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      hintText: 'Type your message...',
                      fillColor: Color.fromARGB(255, 220, 229, 221),
                      filled: true,
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }
}
