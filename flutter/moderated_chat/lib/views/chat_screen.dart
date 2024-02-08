import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:moderated_chat/providers/chat_message_provider.dart';
import 'package:moderated_chat/services/language_service.dart';
import 'package:moderated_chat/widgets/gradient_background.dart';
import 'package:moderated_chat/widgets/language_dropdown.dart';
import 'package:provider/provider.dart';

class ChatScreen extends StatelessWidget {
  ChatScreen({super.key});

  final String title = "Flutter Momento Moderated Chat";

  final TextEditingController _textInputController = TextEditingController();
  final scrollController = ScrollController();

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
                    controller: scrollController,
                    child: ListView.builder(
                      controller: scrollController,
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
                    onSubmitted: (value) =>
                        messageProvider.publishMessage(value),
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
