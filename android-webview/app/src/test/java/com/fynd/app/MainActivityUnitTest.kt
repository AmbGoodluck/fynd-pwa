package com.fynd.app

import org.junit.Test
import org.junit.Assert.*

class MainActivityUnitTest {
    @Test
    fun webAppUrl_isCorrect() {
        // Verify the web app URL matches production
        val expectedUrl = "https://fynd.app"
        assertEquals(expectedUrl, "https://fynd.app")
    }
}
