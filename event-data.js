window.TRADING_CHART_EMBEDDED_DATA = {
  "schemaProperties": {
    "date": {
      "type": "string",
      "description": "Event date in DD-MM-YYYY format.",
      "pattern": "^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\\d{4}$"
    },
    "event_type": {
      "type": "string",
      "description": "High-level category of the event or news.",
      "enum": [
        "Global News",
        "Domestic News",
        "Macro",
        "Macro Event",
        "Market Event",
        "Sector News",
        "Company Event",
        "Policy",
        "Geopolitical",
        "Global Central Bank",
        "Political Event",
        "Global Political Event",
        "Global Flow Event",
        "Global Macro Cluster",
        "Holiday",
        "Earnings Event",
        "Other"
      ]
    },
    "content": {
      "type": "string",
      "description": "Short description of the event or news.",
      "minLength": 1
    },
    "impact": {
      "type": "string",
      "description": "Estimated strength of market impact.",
      "enum": [
        "high",
        "medium",
        "low"
      ]
    },
    "event_status": {
      "type": "string",
      "description": "Whether the event is historical or future-looking.",
      "enum": [
        "actual",
        "scheduled",
        "expected"
      ]
    },
    "certainty": {
      "type": "string",
      "description": "Confidence in the event and/or its likely market relevance.",
      "enum": [
        "high",
        "medium",
        "low"
      ]
    },
    "affected_indices": {
      "type": "array",
      "description": "Indices likely affected by the event.",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": [
          "NIFTY50",
          "BANKNIFTY"
        ]
      }
    },
    "sentiment": {
      "type": "string",
      "description": "Likely directional effect on NIFTY50.",
      "enum": [
        "bullish",
        "bearish",
        "neutral",
        "unknown"
      ]
    },
    "notes": {
      "type": "string",
      "description": "Optional notes or caveats."
    },
    "source": {
      "type": "string",
      "description": "Optional source reference."
    }
  },
  "resources": {
    "BANKNIFTY": {
      "root": {},
      "years": {
        "2026": {
          "holiday": [
            {
              "date": "15-01-2026",
              "name": "Maharashtra Municipal Corporation Election"
            },
            {
              "date": "26-01-2026",
              "name": "Republic Day"
            },
            {
              "date": "03-03-2026",
              "name": "Holi"
            },
            {
              "date": "26-03-2026",
              "name": "Shri Ram Navami"
            },
            {
              "date": "31-03-2026",
              "name": "Shri Mahavir Jayanti"
            },
            {
              "date": "03-04-2026",
              "name": "Good Friday"
            },
            {
              "date": "14-04-2026",
              "name": "Dr. Babasaheb Ambedkar Jayanti"
            },
            {
              "date": "01-05-2026",
              "name": "Maharashtra Day"
            },
            {
              "date": "28-05-2026",
              "name": "Bakri Id (Eid-ul-Adha)"
            },
            {
              "date": "26-06-2026",
              "name": "Muharram"
            },
            {
              "date": "14-09-2026",
              "name": "Ganesh Chaturthi"
            },
            {
              "date": "02-10-2026",
              "name": "Mahatma Gandhi Jayanti"
            },
            {
              "date": "20-10-2026",
              "name": "Dussehra"
            },
            {
              "date": "10-11-2026",
              "name": "Diwali Balipratipada"
            },
            {
              "date": "24-11-2026",
              "name": "Guru Nanak Jayanti"
            },
            {
              "date": "25-12-2026",
              "name": "Christmas"
            }
          ]
        }
      }
    },
    "NIFTY50": {
      "root": {},
      "years": {
        "2026": {
          "future": [
            {
              "date": "28-04-2026",
              "type": "Macro Event",
              "content": "India IIP release; NIFTY and BANKNIFTY monthly expiry; Fed meeting starts",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "29-04-2026",
              "type": "Global Central Bank",
              "content": "FOMC decision window; ECB meeting starts",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "30-04-2026",
              "type": "Global Central Bank",
              "content": "ECB policy decision day",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "01-05-2026",
              "type": "Holiday",
              "content": "NSE closed for Maharashtra Day",
              "impact": "low",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "04-05-2026",
              "type": "Political Event",
              "content": "Counting day for Assam, Kerala, Puducherry, Tamil Nadu and West Bengal assembly elections",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "12-05-2026",
              "type": "Macro Event",
              "content": "India CPI release and MSCI index review announcement",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "26-05-2026",
              "type": "Market Event",
              "content": "NIFTY and BANKNIFTY monthly expiry",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "28-05-2026",
              "type": "Holiday",
              "content": "NSE closed for Bakri Id",
              "impact": "low",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "29-05-2026",
              "type": "Macro Event",
              "content": "India provisional FY 2025-26 GDP and Q4 FY26 GDP release",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "05-06-2026",
              "type": "Macro Event",
              "content": "RBI monetary policy decision day",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "BANKNIFTY",
                "NIFTY50"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "11-06-2026",
              "type": "Global Central Bank",
              "content": "ECB policy decision day",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "12-06-2026",
              "type": "Macro Event",
              "content": "India CPI release",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "16-06-2026",
              "type": "Global Central Bank",
              "content": "BOJ meeting window overlaps with Fed meeting start",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "17-06-2026",
              "type": "Global Central Bank",
              "content": "FOMC policy decision day",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "26-06-2026",
              "type": "Holiday",
              "content": "NSE closed for Muharram",
              "impact": "low",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "30-06-2026",
              "type": "Market Event",
              "content": "NIFTY and BANKNIFTY monthly expiry",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "28-07-2026",
              "type": "Market Event",
              "content": "India IIP release; NIFTY and BANKNIFTY monthly expiry; Fed meeting starts",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "29-07-2026",
              "type": "Global Central Bank",
              "content": "FOMC policy decision day",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "31-07-2026",
              "type": "Global Central Bank",
              "content": "BOJ meeting window ends",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "05-08-2026",
              "type": "Macro Event",
              "content": "RBI monetary policy decision day",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "BANKNIFTY",
                "NIFTY50"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "12-08-2026",
              "type": "Macro Event",
              "content": "India CPI release and MSCI index review announcement",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "25-08-2026",
              "type": "Market Event",
              "content": "NIFTY and BANKNIFTY monthly expiry",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "31-08-2026",
              "type": "Macro Event",
              "content": "India Q1 FY27 GDP release",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "01-09-2026",
              "type": "Global Flow Event",
              "content": "MSCI index review changes become effective",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "10-09-2026",
              "type": "Global Central Bank",
              "content": "ECB policy decision day",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "12-09-2026",
              "type": "Macro Event",
              "content": "India CPI release",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "14-09-2026",
              "type": "Holiday",
              "content": "NSE closed for Ganesh Chaturthi",
              "impact": "low",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "16-09-2026",
              "type": "Global Central Bank",
              "content": "FOMC policy decision day",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "18-09-2026",
              "type": "Global Central Bank",
              "content": "BOJ meeting window ends",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "29-09-2026",
              "type": "Macro Event",
              "content": "ASI results release and NIFTY and BANKNIFTY monthly expiry",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "02-10-2026",
              "type": "Holiday",
              "content": "NSE closed for Mahatma Gandhi Jayanti",
              "impact": "low",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "07-10-2026",
              "type": "Macro Event",
              "content": "RBI monetary policy decision day",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "BANKNIFTY",
                "NIFTY50"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "12-10-2026",
              "type": "Macro Event",
              "content": "India CPI release",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "20-10-2026",
              "type": "Holiday",
              "content": "NSE closed for Dussehra",
              "impact": "low",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "27-10-2026",
              "type": "Market Event",
              "content": "NIFTY and BANKNIFTY monthly expiry; Fed meeting starts",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "28-10-2026",
              "type": "Global Macro Cluster",
              "content": "India IIP release; FOMC policy decision day; ECB meeting starts",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "29-10-2026",
              "type": "Global Macro Cluster",
              "content": "ECB policy decision day; BOJ meeting starts",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "30-10-2026",
              "type": "Global Central Bank",
              "content": "BOJ policy decision day",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "03-11-2026",
              "type": "Global Political Event",
              "content": "US midterm election day",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "10-11-2026",
              "type": "Holiday",
              "content": "NSE closed for Diwali-Balipratipada",
              "impact": "low",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "11-11-2026",
              "type": "Global Flow Event",
              "content": "MSCI index review announcement",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "12-11-2026",
              "type": "Macro Event",
              "content": "India CPI release",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "23-11-2026",
              "type": "Market Event",
              "content": "Likely shifted NIFTY and BANKNIFTY monthly expiry because 24-11-2026 is an NSE holiday",
              "impact": "high",
              "event_status": "expected",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "24-11-2026",
              "type": "Holiday",
              "content": "NSE closed for Prakash Gurpurb Sri Guru Nanak Dev",
              "impact": "low",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "30-11-2026",
              "type": "Macro Event",
              "content": "India Q2 FY27 GDP release",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "01-12-2026",
              "type": "Global Flow Event",
              "content": "MSCI index review changes become effective",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "04-12-2026",
              "type": "Macro Event",
              "content": "RBI monetary policy decision day",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "BANKNIFTY",
                "NIFTY50"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "09-12-2026",
              "type": "Global Central Bank",
              "content": "FOMC policy decision day",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "12-12-2026",
              "type": "Macro Event",
              "content": "India CPI release",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "17-12-2026",
              "type": "Global Central Bank",
              "content": "ECB policy decision day",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "18-12-2026",
              "type": "Global Central Bank",
              "content": "BOJ policy decision day",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "25-12-2026",
              "type": "Holiday",
              "content": "NSE closed for Christmas",
              "impact": "low",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "28-12-2026",
              "type": "Macro Event",
              "content": "India IIP release",
              "impact": "medium",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "29-12-2026",
              "type": "Market Event",
              "content": "NIFTY and BANKNIFTY monthly expiry",
              "impact": "high",
              "event_status": "scheduled",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            },
            {
              "date": "30-12-2026",
              "type": "Other",
              "content": "No major fixed scheduled catalyst found; likely driven by post-expiry positioning and global cues",
              "impact": "low",
              "event_status": "expected",
              "certainty": "low",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "unknown"
            }
          ],
          "holiday": [
            {
              "date": "15-01-2026",
              "name": "Maharashtra Municipal Corporation Election"
            },
            {
              "date": "26-01-2026",
              "name": "Republic Day"
            },
            {
              "date": "03-03-2026",
              "name": "Holi"
            },
            {
              "date": "26-03-2026",
              "name": "Shri Ram Navami"
            },
            {
              "date": "31-03-2026",
              "name": "Shri Mahavir Jayanti"
            },
            {
              "date": "03-04-2026",
              "name": "Good Friday"
            },
            {
              "date": "14-04-2026",
              "name": "Dr. Babasaheb Ambedkar Jayanti"
            },
            {
              "date": "01-05-2026",
              "name": "Maharashtra Day"
            },
            {
              "date": "28-05-2026",
              "name": "Bakri Id (Eid-ul-Adha)"
            },
            {
              "date": "26-06-2026",
              "name": "Muharram"
            },
            {
              "date": "14-09-2026",
              "name": "Ganesh Chaturthi"
            },
            {
              "date": "02-10-2026",
              "name": "Mahatma Gandhi Jayanti"
            },
            {
              "date": "20-10-2026",
              "name": "Dussehra"
            },
            {
              "date": "10-11-2026",
              "name": "Diwali Balipratipada"
            },
            {
              "date": "24-11-2026",
              "name": "Guru Nanak Jayanti"
            },
            {
              "date": "25-12-2026",
              "name": "Christmas"
            }
          ],
          "past": [
            {
              "date": "01-01-2026",
              "type": "Global News",
              "content": "Weak US tech sentiment; cautious start to the year despite auto sales expectations",
              "impact": "low",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "02-01-2026",
              "type": "Market Event",
              "content": "NIFTY hits record high driven by optimism on Q3 earnings and corporate outlook",
              "impact": "high",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bullish"
            },
            {
              "date": "05-01-2026",
              "type": "Global News",
              "content": "Risk-off sentiment due to US-Venezuela tensions and weak rupee",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "06-01-2026",
              "type": "Company Event",
              "content": "Profit booking in heavyweights like HDFC Bank and Reliance drags index",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "07-01-2026",
              "type": "Global News",
              "content": "FII selling and tariff concerns weigh on market sentiment",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "08-01-2026",
              "type": "Global News",
              "content": "Geopolitical tensions and foreign outflows keep markets cautious",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "09-01-2026",
              "type": "Market Event",
              "content": "Broad selloff as global uncertainty increases",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "12-01-2026",
              "type": "Global News",
              "content": "Positive cues from US-India trade sentiment support recovery",
              "impact": "low",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bullish"
            },
            {
              "date": "13-01-2026",
              "type": "Macro",
              "content": "Crude oil rise, rupee weakness, and FII selling pressure markets",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "23-01-2026",
              "type": "Market Event",
              "content": "Foreign investor profit booking leads to weakness",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "30-01-2026",
              "type": "Macro",
              "content": "Economic Survey optimism offset by high oil prices and weak rupee",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "01-02-2026",
              "type": "Macro Event",
              "content": "Union Budget 2026 triggers volatility and sharp selloff",
              "impact": "high",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "02-02-2026",
              "type": "Market Event",
              "content": "Market rebounds after budget selloff as investors reassess",
              "impact": "high",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bullish"
            },
            {
              "date": "06-02-2026",
              "type": "Macro Event",
              "content": "RBI keeps repo rate unchanged at 5.25 percent",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "BANKNIFTY",
                "NIFTY50"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "10-02-2026",
              "type": "Market Event",
              "content": "FII inflows and strong auto sector support gains",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bullish"
            },
            {
              "date": "13-02-2026",
              "type": "Sector News",
              "content": "IT sector selloff driven by global tech concerns",
              "impact": "high",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "20-02-2026",
              "type": "Sector News",
              "content": "Infosys and IT stocks drag index amid global tech weakness",
              "impact": "high",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "23-02-2026",
              "type": "Global News",
              "content": "US Supreme Court rejects tariffs improving global sentiment",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bullish"
            },
            {
              "date": "26-02-2026",
              "type": "Sector News",
              "content": "IT and pharma support market while FMCG lags",
              "impact": "low",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bullish"
            },
            {
              "date": "04-03-2026",
              "type": "Global News",
              "content": "Rising global risks trigger market decline",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "06-03-2026",
              "type": "Sector News",
              "content": "Banking and auto stocks drag market while IT shows resilience",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "16-03-2026",
              "type": "Market Event",
              "content": "Strong rebound led by banking and auto sectors",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bullish"
            },
            {
              "date": "20-03-2026",
              "type": "Macro",
              "content": "Cooling oil prices support relief rally",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bullish"
            },
            {
              "date": "25-03-2026",
              "type": "Global News",
              "content": "Easing US-Iran tensions improve sentiment",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bullish"
            },
            {
              "date": "27-03-2026",
              "type": "Global News",
              "content": "Iran conflict concerns, high crude, and FII outflows drag market",
              "impact": "high",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "30-03-2026",
              "type": "Market Event",
              "content": "Continued broad selloff due to risk-off sentiment",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "31-03-2026",
              "type": "Holiday",
              "content": "Market closed for Mahavir Jayanti",
              "impact": "low",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "01-04-2026",
              "type": "Holiday",
              "content": "Market closed for annual bank closing",
              "impact": "low",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "03-04-2026",
              "type": "Holiday",
              "content": "Market closed for Good Friday",
              "impact": "low",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "13-04-2026",
              "type": "Market Event",
              "content": "Market declines amid cautious sentiment in shortened trading week",
              "impact": "medium",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "14-04-2026",
              "type": "Holiday",
              "content": "Market closed for Ambedkar Jayanti",
              "impact": "low",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "neutral"
            },
            {
              "date": "23-04-2026",
              "type": "Global News",
              "content": "Renewed US-Iran tensions and naval conflict concerns impact sentiment",
              "impact": "high",
              "event_status": "actual",
              "certainty": "medium",
              "affected_indices": [
                "NIFTY50",
                "BANKNIFTY"
              ],
              "sentiment": "bearish"
            },
            {
              "date": "24-04-2026",
              "type": "Sector News",
              "content": "IT stocks fall sharply; Infosys hits 52-week low dragging index",
              "impact": "high",
              "event_status": "actual",
              "certainty": "high",
              "affected_indices": [
                "NIFTY50"
              ],
              "sentiment": "bearish"
            }
          ]
        }
      }
    },
    "P_AND_L_AND_LEARNINGS": {
      "root": {},
      "years": {
        "2026": {
          "pnl": [
            {
              "date": "01-04-2026",
              "profit": 0,
              "loss": 58941.55
            },
            {
              "date": "06-04-2026",
              "profit": 0,
              "loss": 226349.5
            },
            {
              "date": "07-04-2026",
              "profit": 42308.5,
              "loss": 0
            },
            {
              "date": "08-04-2026",
              "profit": 4069,
              "loss": 0
            },
            {
              "date": "09-04-2026",
              "profit": 24352.25,
              "loss": 0
            },
            {
              "date": "10-04-2026",
              "profit": 2999.75,
              "loss": 0
            },
            {
              "date": "13-04-2026",
              "profit": 6786,
              "loss": 0
            },
            {
              "date": "14-04-2026",
              "profit": 0,
              "loss": 0
            },
            {
              "date": "15-04-2026",
              "profit": 1417,
              "loss": 0
            },
            {
              "date": "16-04-2026",
              "profit": 0,
              "loss": 94760.25
            },
            {
              "date": "20-04-2026",
              "profit": 3617.25,
              "loss": 0
            },
            {
              "date": "21-04-2026",
              "profit": 11030.5,
              "loss": 0
            },
            {
              "date": "22-04-2026",
              "profit": 2548,
              "loss": 0
            },
            {
              "date": "23-04-2026",
              "profit": 11284,
              "loss": 0
            },
            {
              "date": "24-04-2026",
              "profit": 6269.25,
              "loss": 0
            },
            {
              "date": "27-04-2026",
              "profit": 0,
              "loss": 45656
            },
            {
              "date": "28-04-2026",
              "profit": 31962.25,
              "loss": 0
            },
            {
              "date": "29-04-2026",
              "profit": 19513,
              "loss": 0
            },
            {
              "date": "02-12-2026",
              "profit": 5000,
              "loss": 0
            },
            {
              "date": "03-12-2026",
              "profit": 0,
              "loss": 10000
            },
            {
              "date": "02-07-2026",
              "profit": 10000,
              "loss": 0
            },
            {
              "date": "03-07-2026",
              "profit": 0,
              "loss": 5000
            },
            {
              "date": "02-03-2026",
              "profit": 0,
              "loss": 1525
            },
            {
              "date": "05-03-2026",
              "profit": 1309.75,
              "loss": 0
            },
            {
              "date": "09-03-2026",
              "profit": 0,
              "loss": 2814.5
            },
            {
              "date": "10-03-2026",
              "profit": 4234.75,
              "loss": 0
            },
            {
              "date": "11-03-2026",
              "profit": 2213.25,
              "loss": 0
            },
            {
              "date": "12-03-2026",
              "profit": 7335.25,
              "loss": 0
            },
            {
              "date": "16-03-2026",
              "profit": 0,
              "loss": 7250.75
            },
            {
              "date": "17-03-2026",
              "profit": 14839.5,
              "loss": 0
            },
            {
              "date": "18-03-2026",
              "profit": 11170.25,
              "loss": 0
            },
            {
              "date": "19-03-2026",
              "profit": 9681.75,
              "loss": 0
            },
            {
              "date": "20-03-2026",
              "profit": 6773,
              "loss": 0
            },
            {
              "date": "23-03-2026",
              "profit": 6987.5,
              "loss": 0
            },
            {
              "date": "24-03-2026",
              "profit": 51814.75,
              "loss": 0
            },
            {
              "date": "25-03-2026",
              "profit": 9015.5,
              "loss": 0
            },
            {
              "date": "30-03-2026",
              "profit": 0,
              "loss": 293494.5
            },
            {
              "date": "04-05-2026",
              "profit": 20000,
              "loss": 0
            },
            {
              "date": "05-05-2026",
              "profit": 0,
              "loss": 10000
            }
          ],
          "holiday": [
            {
              "date": "15-01-2026",
              "name": "Maharashtra Municipal Corporation Election"
            },
            {
              "date": "26-01-2026",
              "name": "Republic Day"
            },
            {
              "date": "03-03-2026",
              "name": "Holi"
            },
            {
              "date": "26-03-2026",
              "name": "Shri Ram Navami"
            },
            {
              "date": "31-03-2026",
              "name": "Shri Mahavir Jayanti"
            },
            {
              "date": "03-04-2026",
              "name": "Good Friday"
            },
            {
              "date": "14-04-2026",
              "name": "Dr. Babasaheb Ambedkar Jayanti"
            },
            {
              "date": "01-05-2026",
              "name": "Maharashtra Day"
            },
            {
              "date": "28-05-2026",
              "name": "Bakri Id (Eid-ul-Adha)"
            },
            {
              "date": "26-06-2026",
              "name": "Muharram"
            },
            {
              "date": "14-09-2026",
              "name": "Ganesh Chaturthi"
            },
            {
              "date": "02-10-2026",
              "name": "Mahatma Gandhi Jayanti"
            },
            {
              "date": "20-10-2026",
              "name": "Dussehra"
            },
            {
              "date": "10-11-2026",
              "name": "Diwali Balipratipada"
            },
            {
              "date": "24-11-2026",
              "name": "Guru Nanak Jayanti"
            },
            {
              "date": "25-12-2026",
              "name": "Christmas"
            }
          ]
        },
        "2027": {
          "pnl": [
            {
              "date": "04-01-2027",
              "profit": 15000,
              "loss": 0
            },
            {
              "date": "05-01-2027",
              "profit": 0,
              "loss": 10000
            }
          ]
        }
      }
    }
  }
};
