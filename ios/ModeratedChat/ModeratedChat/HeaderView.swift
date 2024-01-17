//
//  HeaderView.swift
//  ModeratedChat
//
//  Created by Anita Ruangrotsakun on 1/16/24.
//

import SwiftUI

struct HeaderView: View {
    let displayLanguage: Bool
    
    var body: some View {
        ZStack {
            Rectangle()
                .fill(Color(red: 37/225, green: 57/225, blue: 43/225))
                .frame(width: .infinity, height: 50.0)
            HStack {
                Image("mochat-mo-peek-up")
                    .resizable()
                    .frame(width: 45.0, height: 45.0, alignment: .leading)
                Text("Welcome to MoChat")
                    .foregroundStyle(.white)
                    .font(.title3)
                    .fontWeight(/*@START_MENU_TOKEN@*/.bold/*@END_MENU_TOKEN@*/)
                    .frame(maxWidth: .infinity, alignment: .center)
                if displayLanguage {
                    Text("Language Selector TBA")
                        .foregroundStyle(.white)
                        .font(.caption)
                        .frame(maxWidth: 100.0, alignment: .trailing)
                }
            }
        }
    }
}

#Preview {
    VStack {
        HeaderView(displayLanguage: true)
        HeaderView(displayLanguage: false)
    }
}
