import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:moderated_chat/config.dart';

class LanguageService {
  static final LanguageService _instance = LanguageService._internal();

  factory LanguageService() {
    return _instance;
  }

  LanguageService._internal();

  Future<Map<String, String>> getSupportedLanguages() async {
    final supportedLanguages = <String, String>{};
    const apiUrl = "${Config.baseUrl}/v1/translate/languages";
    final response = await http.get(Uri.parse(apiUrl));
    if (response.statusCode == 200) {
      final jsonObject = jsonDecode(utf8.decode(response.bodyBytes));
      final languages = jsonObject["supportedLanguages"];
      for (final language in languages) {
        final value = language["value"];
        final label = language["label"];
        supportedLanguages[value] = label;
      }
    } else {
      print("Failed to load supported languages: ${response.statusCode}");
      supportedLanguages["en"] = "🇺🇸 English";
    }
    return supportedLanguages;
  }
}
