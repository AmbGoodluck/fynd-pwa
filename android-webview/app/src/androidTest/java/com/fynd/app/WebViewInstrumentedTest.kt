package com.fynd.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.assertion.WebViewAssertions.webMatches
import androidx.test.espresso.web.model.Atoms.getCurrentUrl
import androidx.test.ext.junit.rules.ActivityScenarioRule
import org.hamcrest.Matchers.containsString
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WebViewInstrumentedTest {

    @get:Rule
    val activityScenarioRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun webView_loadsCorrectUrl() {
        // Wait for the WebView to finish loading
        Thread.sleep(5000)

        onWebView()
            .check(webMatches(getCurrentUrl(), containsString("fynd.app")))
    }
}
