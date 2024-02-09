import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:moderated_chat/config.dart';

import '../models/chat_user.dart';

class UserService {
  final String username;
  final String userId;

  UserService(this.username, this.userId);

  Future<(String apiToken, int expiresAt)> getApiToken() async {
    const apiUrl = "${Config.baseUrl}/v1/translate/token";
    final uri = Uri.parse(apiUrl);
    final headers = {'Content-Type': 'application/x-www-form-urlencoded'};

    final body = {
      'username': username,
      'id': userId,
    };

    final encodedBody = body.keys
        .map((key) => "$key=${Uri.encodeComponent(body[key]!)}")
        .join("&");

    try {
      final response =
          await http.post(uri, headers: headers, body: encodedBody);
      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        final String momentoApiToken = jsonResponse['token'];
        final int tokenExpiresAt = jsonResponse['expiresAtEpoch'];
        return (momentoApiToken, tokenExpiresAt);
      } else {
        throw Exception(
            'Unable to get API token. Request failed with status: ${response.statusCode}.');
      }
    } catch (e) {
      throw Exception('Unable to get API token: $e');
    }
  }

  ChatUser getUser() {
    return ChatUser(username, userId.toString());
  }
}
