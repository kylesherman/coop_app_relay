//
//  Theme.swift
//  CoopTrackingApp
//
//  Created by Kyle Sherman on 6/10/25.
//

import SwiftUI

struct Theme {
    static var background: Color {
        Color(uiColor: UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark
                ? UIColor.black
                : UIColor(red: 250/255, green: 249/255, blue: 246/255, alpha: 1) // eggshell
        })
    }

    static var card: Color {
        Color(uiColor: UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark
                ? UIColor(red: 28/255, green: 28/255, blue: 30/255, alpha: 1) // system gray6
                : UIColor.white
        })
    }
}
