import 'package:flutter/material.dart';
import 'package:moderated_chat/services/language_service.dart';

class LanguageDropdown extends StatefulWidget {
  final LanguageService _languageService = LanguageService();
  final void Function(String) onLanguageChanged;

  LanguageDropdown({super.key, required this.onLanguageChanged});

  @override
  State<LanguageDropdown> createState() => _LanguageDropdownState();
}

class _LanguageDropdownState extends State<LanguageDropdown> {
  String _selectedLanguage = "en";
  Map<String, String> _supportedLanguages = {"en": "🇺🇸 English"};

  @override
  void initState() {
    super.initState();
    widget._languageService.getSupportedLanguages().then((languages) {
      setState(() {
        _supportedLanguages = languages;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return DropdownButton<String>(
      value: _selectedLanguage,
      items: _supportedLanguages.keys
          .map((language) => DropdownMenuItem(
                value: language,
                child: Text(_supportedLanguages[language]!,
                    style: const TextStyle(
                        color: Colors.white,
                        backgroundColor: Color.fromARGB(255, 14, 37, 21),
                        fontFamily: 'Inter')),
              ))
          .toList(),
      onChanged: (String? value) {
        if (value != null) {
          setState(() {
            _selectedLanguage = value;
            widget.onLanguageChanged(value);
          });
        }
      },
      dropdownColor: const Color.fromARGB(255, 14, 37, 21),
    );
  }
}
