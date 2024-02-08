import 'package:flutter/material.dart';

class GradientBackground extends StatelessWidget {
  final Widget child;
  const GradientBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          colors: [
            Color.fromARGB(255, 37, 57, 43), // Center color
            Color.fromARGB(255, 14, 37, 21), // Edge color
          ],
          stops: [0.5, 1.0],
          center: Alignment.center,
          radius: 0.8,
        ),
      ),
      child: child,
    );
  }
}
