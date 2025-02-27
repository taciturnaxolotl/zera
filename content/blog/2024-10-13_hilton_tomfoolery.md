+++
title = "Hilton Tomfoolery"
date = 2024-10-13
slug = "hilton-tomfoolery"
description = "Playing around with mitmproxy and the Hilton Honors app as well as a flipper zero"

[taxonomies]
tags = ["reverse engineering", "hilton"]

[extra]
has_toc = true
+++

I'm at a Hilton at the time of writing this, and I'm decently bored. Currently, I'm downloading the latest version of RogueMaster (0.420.0) to my flipper, as it is currently crashing every time I open the NFC app. My dad tried out the app unlock feature in the Hilton app for the first time today, which, as most new tech things, made me quite curious how it worked and whether I could break it. Based on playing with it, there seems to be a proximity reading (over Bluetooth? Perhaps a BLE beacon?) to detect if you are by your door but for a period of time (~20 sec) after getting that signal it allows you to unlock the door from across the room which I'm guessing means that it controls the locks via a central server. The current plan is to install the root cert (of mitmproxy) on my iPhone and then try and intercept those API calls and see if we can manipulate them in any interesting ways. I'm also planning on live blogging this, which I've never tried before. (I also wrote this whole article in vim ^_^)

<!-- more -->

## Connecting to Mitmproxy

I'm connecting over WireGuard, so I fired up mitmproxy with `mitmweb --mode wireguard` on my laptop. Connecting via WireGuard theoretically is pretty simple; all I need to do is to scan a qr code and connect. Unfortunately, the hotel Wi-Fi seems to be oddly segmented, and I can't access the WireGuard server or ping my laptop from my phone. I'm going to try firing up a hot spot on my dad's phone and see if that allows me to talk to my phone.

{{ img(id="https://cloud-ryjlxhb9r-hack-club-bot.vercel.app/2install_profile.png" alt="screenshot of the root certificate install process" caption="You have to dig through several menus to trust it") }}

I messed with getting my laptop to connect to my dad's phone, but it kept refusing for some reason. My next idea is to ngrok the WireGuard tunnel, which ended up failing because ngrok doesn't support UDP. Finally, after an embarrassingly long time, I realized that I could simply use `ngrok tcp 8080` and the HTTP proxy server built into mitmproxy instead. After installing the root certificate and trusting it in the iPhone settings, we were good to go!

## Digging around in the Hilton Honors app

First I had to download the app, which required disabling the proxy as iOS seems to ignore certificate trust settings for the app store. Enrollment happened via the `https://m.hilton.io/graphql/customer?operationName=createGuest&type=enroll` endpoint and was as follows:

> POST
```json
{
  "query": "...",
  "variables": {
    "input": {
      "email": {
        "emailAddress": "xxxx-xxxx-xxxx@duck.com"
      },
      "preferredLanguage": "EN",
      "enrollSourceCode": "IOSEW",
      "phone": {
        "phoneNumber": "xxxxxxxxxx",
        "phoneType": "home"
      },
      "subscriptions": {
        "hhonorsSubscriptions": [],
        "optOuts": {
          "survey": false,
          "marketing": false
        }
      },
      "name": {
        "firstName": "Kieran",
        "lastName": "Klukas"
      },
      "address": {
        "city": "Washington",
        "addressType": "home",
        "addressLine2": null,
        "postalCode": "20003",
        "state": "DC",
        "addressLine1": "1600 Pennsylvania Ave SE Apartments",
        "country": "US"
      },
      "privacyRequested": false,
      "password": "xxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "language": "en_US"
  },
  "operationName": "createGuest"
}
```
```bash
---
mutation createGuest($input: EnrollInput!, $language: String!) {
    createGuest(language: $language, input: $input) {
        data {
            guestId
            hhonorsNumber
        }
        error {
            code
            context
            message
            notifications {
                code
                fields
                message
            }
        }
    }
}
```
<br/>

> response

```json
{
    "data": {
        "createGuest": {
            "data": {
                "guestId": 1726240000,
                "hhonorsNumber": "225782xxxx"
            },
            "error": null
        }
    },
    "extensions": {
        "logSearch": "mdc.client_message_id=51da35305bde9b71e7faa2993ebc2a619e50c598-iap71t195vk6jur6eyd83hy9g21w4bzam"
    }
}
```
<br/>

> headers

```json
{
    "access_token": "DX.eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkEyNTZHQ00iLCJwaWQiOiJtb2JpbGUiLCJraWQiOiJWTktOaU9WLTZ4c2cyOXQ2dEJUMmR5Nnl1TEJPUG8tb2FycDFpZzZnVWdZIn0.Yfxkp8Jnrwttmrp_QcMTp6HwW2yBzEIROsAjheNVd3LgIWBQVfw5UDstAd7qA3MKZffoKSf7SbkopJhWIr-vreOYQ2BZEf2a9DYm4p-tD9jXEMsuVY9offYqjRzyeWwcjLyWq9ubnUBpQuCHMNUO1025BZkNV3NYG3_LZfJlNc77aMawrfS52zi5I5hSL0zAs3K7kxYuReJEC-RzASt-coPHEmdkmDp1TLqujqe8Opy6z4DC8xFDFkO09J-tN6RwolJ6jtssr0vnFyCv9zw_lbAQppB0jbWZqxiEmNk_krC4laOsChe3bUJc8ECeKltvqgVnSAKAhz-zBfy9EbFeew.Wki3N1rclvnjMfA4.dtWVnkpMJZixW86Q9hiiBY30_Oa1NHPLM_SuuAjtTrY-QZilp5tgu7COJtiVYI51_j6nIOHdX2oI0EoiHaPhzC4YizFxNbZsUfpR0W6wPVWj3LpdTr23GMhoOga5UTFCbaehb5XCsWr9PLfnLc2tSGyi4wZOSGrSidQUCDQ6UssUTxt6vvlp5y623EbvkMEi-ok6IXqUnYgsztcz_i14GKRHdRmJZFACJj3X0zQLarN4b19KEwvqIXfIrpPWpr1f74ozamM6CUEQhqoF61cucKCxKf0hU7kAyMduo4l3OfEkghQUfrlfA1D7eoInyPcOb8a3_LjQhGXwh1XVoElXUriuP7yEOfyksv59_pKCWajzJuyWdEl164OZXAFmMkdQ89flDO3_nRZUliMXapnWkU3WDBGD_gQ49sYbxlAh95l0HiJeKZwf2g4DTlEb6ccauRAbUzD2Fopoe2ldMXL-wBkVg2Grx8SfaCnOCiyfGq2HloJMf-8YRz-tWQoTXFEM30KdJCWY70sUTY9LeWVQrz4dnpZlRk29KyNi20YsdQRK3y9_ZFL0qs4IJwhddtrhzQVKz6oaxDPgQxy2vK1DErers-8-oJ3WgDho9l9D7Z7U9C1spjf1IIBG5hvdtCiExqh78fFsizcvkG9oeHB09Z1oGU3jL_cUFKrrUp9ZXnOKlwU1BjFPrOjVVZi97-rVN3IjvlRjJCBfFCf2CxlbZcib_CWSiD0vtFsloClkmSho2ynnbLQG341SibvaO4TKygttS-NsluDjBtpuJydlNjDAXO6ZvWRiFWcHDrDqiBeo897yUM40kHYFXBpjhbiIDcCnAJu6GDozbacnGsEGOJlauASm3t8TFn1lPd_kQgd3Uy2fDtTCKxxSaXA4RvHwUbBgYWU4SMA7UPYn_RygkxUZ0UL4ZHfN1-bDpkQ16DLm0Q.hh53MImM9BA7Ujib61RUOg",
    "exp": 1728879203,
    "expires_in": 3600,
    "iat": 1728875603,
    "scope": "am_application_scope default",
    "token_type": "Bearer"
}
```

At this point I went to bed as it was about 23:30, but I set my alarm for 5:30 (if you know me I never get up before 8:00, so this is rare) and actually managed to wake-up on time. It's always quite curious how excitement and a new place can cause you to wake-up earlier. Unfortunately, while I was sleeping my laptop died which caused me to lose the rest of the signup data. I'm going to invite myself to get the room key and see what API requests that triggers, and then try actually unlocking the door.

# Invitation

> Hi Kieran,  
> I’m sharing my Digital Key so you can use your phone as a room key.  
> If you already have the Hilton Honors app make sure you are on the latest version and click this https://hiltonhonors3.hilton.com/rs/hilton-honors-mobile-app?shareId=b4d6140d311e4c4c935dd653ca00af65 to accept the Digital Key.  
> If you don’t have the Hilton Honors app, download it using the link above and return to this message to accept within 8 hours to get your key.  
> See you soon,  
> xxxx xxxx  

I shared the key which asked for a name and then opened the iOS share sheet and I choose to send by text (it sent the above message). I went back to my phone, clicked the link and low and behold we got a hit! `https://hms.hiltonapi.com/hms/v1/digitalkey/invitation/accept`:

> POST
```json
{
    "shareId": "b4d6140d311e4c4c935dd653ca00af65"
}
```

<br/>

> response
```json
{
    "arrivalDateTime": "2024-10-13T15:00-04:00",
    "confirmationNumber": "5448xxxx",
    "ctyhocn": "GCYPAHX",
    "departureDateTime": "2024-10-14T11:00-04:00",
    "hotelName": "Hampton Inn & Suites Grove City",
    "stayId": "296088xxxx"
}
```

Another interesting request was to `https://m.hilton.io/graphql/customer?operationName=hotel_brand&type=hotelDetails_GCYPAHX` 

> POST
```json
{
  "variables": {
    "ctyhocn": "GCYPAHX",
    "language": "en-US"
  },
  "operationName": "hotel_brand",
  "query": "..."
}
```
```bash
---
query hotel_brand($language: String!, $ctyhocn: String!) {
  hotel(language: $language, ctyhocn: $ctyhocn) {
    address {
      addressFmt
      addressLine1
      addressLine2
      city
      country
      countryName
      postalCode
      state
    }
    alerts {
      description
      type
    }
    amenities {
      id
      name
    }
    attributes {
      numberOfRestaurants
    }
    brand {
      isPartnerBrand
    }
    brandCode
    campus {
      type
    }
    chainCode
    checkin {
      checkinTimeFmt
      checkinTime
      checkoutTimeFmt
      checkoutTime
      digitalKey
    }
    config {
      checkout {
        allowDCO
      }
      connectedRoom {
        crEnabled
        crFullyEnabled
        emsEnabled
      }
      messaging {
        kipsuEnabled
        messagingTileEnabled
        gatewayRoutingEnabled
      }
      adjoiningRooms {
        active
      }
    }
    coordinate {
      latitude
      longitude
    }
    crsData {
      adultAge
      ageBasedPricing
      acceptedCreditCards
    }
    ctyhocn
    currencyCode
    display {
      treatments
    }
    gmtHours
    internetAddress
    name
    phoneNumber
    policyOptions {
      label
      value
      options {
        label
        value
      }
    }
    facilityOverview {
      shortDesc
    }
    images {
      master {
        altText
        url(height: 430, width: 612)
      }
      gallery {
        image(variant: searchPropertyImageThumbnail) {
          altText
          url(height: 430, width: 612)
        }
        masterImage
      }
      carousel {
        altText
        url(height: 430, width: 612)
      }
    }
  }
}
```

<br/>

> response
```json
{
    "data": {
        "hotel": {
            "address": {
                "addressFmt": "4 Holiday Blvd., Mercer, Pennsylvania, 16137, USA",
                "addressLine1": "4 Holiday Blvd.",
                "addressLine2": null,
                "city": "Mercer",
                "country": "US",
                "countryName": "USA",
                "postalCode": "16137",
                "state": "PA"
            },
            "alerts": [
                {
                    "description": "The hotel will be undergoing exterior renovations September 03, 2024 - December 31, 2024. The interior and guestrooms will be unaffected. Thank you for your patience and understanding.",
                    "type": "alert"
                }
            ],
            "amenities": [
                {
                    "id": "adjoiningRooms",
                    "name": "Connecting Rooms"
                },
                {
                    "id": "freeBreakfast",
                    "name": "Free hot breakfast"
                },
                {
                    "id": "freeParking",
                    "name": "Free parking"
                },
                {
                    "id": "freeWifi",
                    "name": "Free WiFi"
                },
                {
                    "id": "nonSmoking",
                    "name": "Non-smoking rooms"
                },
                {
                    "id": "digitalKey",
                    "name": "Digital Key"
                },
                {
                    "id": "evCharging",
                    "name": "EV charging"
                },
                {
                    "id": "indoorPool",
                    "name": "Indoor pool"
                },
                {
                    "id": "fitnessCenter",
                    "name": "Fitness center"
                },
                {
                    "id": "petsAllowed",
                    "name": "Pet-friendly rooms"
                },
                {
                    "id": "meetingRooms",
                    "name": "Meeting rooms"
                }
            ],
            "attributes": {
                "numberOfRestaurants": 0
            },
            "brand": {
                "isPartnerBrand": false
            },
            "brandCode": "HP",
            "campus": {
                "type": "enhanced"
            },
            "chainCode": "HH",
            "checkin": {
                "checkinTime": "15:00",
                "checkinTimeFmt": "3:00 PM",
                "checkoutTime": "11:00",
                "checkoutTimeFmt": "11:00 AM",
                "digitalKey": true
            },
            "config": {
                "adjoiningRooms": {
                    "active": true
                },
                "checkout": {
                    "allowDCO": true
                },
                "connectedRoom": null,
                "messaging": {
                    "gatewayRoutingEnabled": true,
                    "kipsuEnabled": true,
                    "messagingTileEnabled": true
                }
            },
            "coordinate": {
                "latitude": 41.142354,
                "longitude": -80.164956
            },
            "crsData": {
                "acceptedCreditCards": [
                    "CU",
                    "VI",
                    "MC",
                    "AX",
                    "DS",
                    "DC",
                    "CB"
                ],
                "adultAge": null,
                "ageBasedPricing": null
            },
            "ctyhocn": "GCYPAHX",
            "currencyCode": "USD",
            "display": {
                "treatments": []
            },
            "facilityOverview": {
                "shortDesc": "We're off I-79, 10 minutes from Grove City. Grove City Premium Outlets and Wendell August Forge, America's oldest and largest working forge, are less than a mile away. Both Grove City College and Slippery Rock University are within 20 minutes of us. Enjoy free hot breakfast, free WiFi, and our indoor pool and hot tub."
            },
            "gmtHours": -4,
            "images": {
                "carousel": [
                    {
                        "altText": "Outdoor Patio",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/2888809/gcypahx-patio.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Double Queen",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/4248848/hampton-grove-city-standard-queen-1-preview.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "King Standard",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/4248016/hampton-grove-city-king-standard-1.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Lobby and Dining Area",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/2887422/lobby-1.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Lobby",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/2887224/lobby-2.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Breakfast Buffet",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/2880542/breakfast-1.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Indoor Pool",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/4258295/hampton-new-pics-2008-035.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Fitness Center",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/2883297/fitness.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Boardroom",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/2879933/board-room.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Meeting Room",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/2888194/meeting.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Hotel Exterior at Night",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/4251655/exterior-night.jpg?impolicy=resize&rh=430&rw=612"
                    },
                    {
                        "altText": "Business Center",
                        "url": "https://www.hilton.com/im/en/GCYPAHX/2881016/business-center.jpg?impolicy=resize&rh=430&rw=612"
                    }
                ],
                "gallery": [
                    {
                        "image": {
                            "altText": "Outdoor Patio",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2888809/gcypahx-patio.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": true
                    },
                    {
                        "image": {
                            "altText": "Double Queen",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/4248848/hampton-grove-city-standard-queen-1-preview.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "King Standard",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/4248016/hampton-grove-city-king-standard-1.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Lobby and Dining Area",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2887422/lobby-1.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Lobby",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2887224/lobby-2.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Breakfast Buffet",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2880542/breakfast-1.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Indoor Pool",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/4258295/hampton-new-pics-2008-035.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Fitness Center",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2883297/fitness.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Boardroom",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2879933/board-room.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Meeting Room",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2888194/meeting.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Hotel Exterior at Night",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/4251655/exterior-night.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Business Center",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2881016/business-center.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Indoor Pool / Whirlpool",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2885342/pool.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Double Queen Studio",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/4250170/hampton-new-pics-2008-020.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Whirlpool Suite",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/4251204/whirlpool-king-suite-one-2-2-.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Breakfast Area",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2880342/breakfast-2.tif?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Suite Shop",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/2890823/gift-shop.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Hotel Exterior",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/390670/gcypahx-hampton-exterior-night-1.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Hotel Exterior",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/4255766/hampton-new-pics-2008-012.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    },
                    {
                        "image": {
                            "altText": "Double Queen Suite",
                            "url": "https://www.hilton.com/im/en/GCYPAHX/4251117/double-queen-standard-2-.jpg?impolicy=resize&rh=430&rw=612"
                        },
                        "masterImage": false
                    }
                ],
                "master": {
                    "altText": "Outdoor Patio",
                    "url": "https://www.hilton.com/im/en/GCYPAHX/2888809/gcypahx-patio.jpg?impolicy=resize&rh=430&rw=612"
                }
            },
            "internetAddress": "https://www.hilton.com/en/hotels/gcypahx-hampton-suites-grove-city/",
            "name": "Hampton Inn & Suites Grove City",
            "phoneNumber": "+1 724-748-5744",
            "policyOptions": [
                {
                    "label": "Cancellation",
                    "options": [
                        {
                            "label": "Description",
                            "value": "Cancellation policies may vary depending on the rate or dates of your reservation. Please refer to your reservation confirmation to verify your cancellation policy. If you need further assistance, call the hotel directly or contact <a href=https://help.hilton.com/s/>customer service</a>. Alternatively, you can <a href=https://www.hilton.com/en/book/reservation/find/>cancel your reservation online</a>."
                        }
                    ],
                    "value": null
                },
                {
                    "label": "Check-in/Check-out",
                    "options": [
                        {
                            "label": "Checkin Time",
                            "value": "3:00 PM"
                        },
                        {
                            "label": "Checkout Time",
                            "value": "11:00 AM"
                        },
                        {
                            "label": "Early Departure Fee",
                            "value": null
                        },
                        {
                            "label": "Late Checkout Fee",
                            "value": null
                        },
                        {
                            "label": "Minimum Age To Register",
                            "value": "21"
                        }
                    ],
                    "value": null
                },
                {
                    "label": "Wi-Fi",
                    "options": [
                        {
                            "label": "Description",
                            "value": "Standard In-Room and Lobby Wi-Fi - All guests get free standard Wi-Fi in-room and in the lobby."
                        }
                    ],
                    "value": null
                },
                {
                    "label": "Parking",
                    "options": [
                        {
                            "label": "Covered",
                            "value": "Not Available"
                        },
                        {
                            "label": "In Out Privileges",
                            "value": "Not Available"
                        },
                        {
                            "label": "Other Parking Information",
                            "value": "Parking Lot"
                        },
                        {
                            "label": "Secured",
                            "value": "Not Available"
                        },
                        {
                            "label": "Self Parking",
                            "value": "$0.00 Complimentary"
                        },
                        {
                            "label": "Valet Parking",
                            "value": "Not Available"
                        }
                    ],
                    "value": null
                },
                {
                    "label": "Payment",
                    "options": [
                        {
                            "label": "Hotel Currency",
                            "value": "US Dollar"
                        },
                        {
                            "label": "Accepted Payment Options",
                            "value": "American Express, Carte Blanche, China Union Pay, Diner's Club, Discover, MasterCard, Visa"
                        }
                    ],
                    "value": null
                },
                {
                    "label": "Pets",
                    "options": [
                        {
                            "label": "Deposit",
                            "value": "$50.00 Non-Refundable"
                        },
                        {
                            "label": "Kennel Message",
                            "value": null
                        },
                        {
                            "label": "Maximum Size",
                            "value": null
                        },
                        {
                            "label": "Maximum Weight",
                            "value": null
                        },
                        {
                            "label": "Other Pet Services",
                            "value": "$50(1-4n),$75(5+n) 2petsMax,dog/cat only"
                        },
                        {
                            "label": "Pets Allowed",
                            "value": "Yes"
                        },
                        {
                            "label": "Service Animals Allowed",
                            "value": "Yes"
                        }
                    ],
                    "value": null
                },
                {
                    "label": "Smoking",
                    "options": [
                        {
                            "label": "Indicator",
                            "value": "Non-Smoking"
                        },
                        {
                            "label": "Description",
                            "value": null
                        }
                    ],
                    "value": null
                }
            ]
        }
    },
    "extensions": {
        "logSearch": "mdc.client_message_id=51da35305bde9b71e7faa2993ebc2a619e50c598-uauhdwbaydoqbvy3uvuzai20c4takt22"
    }
}
```

It appears that Hilton relies very heavily on GraphQL, which is interesting. I would be interested in playing with those APIs more. For now, though, onto unlocking stuff!

## Locks

{{ img(id="https://cloud-ryjlxhb9r-hack-club-bot.vercel.app/0hotel-key.png" alt="screenshot of the hotel digital key" caption="What it looks like in the app") }}

When using the unlock button, it made a request to this URL: `https://smetric.hilton.com/b/ss/hiltonglobalprod/10/IOSN030200030900/s65425920` with a payload of a URL encoded form.

> POST
```yaml
ndh:              1
cid.:             
card_no.:         
as:               0
id:               2257829743
.card_no:         
hhid.:            
as:               1
id:               2257829743
.hhid:            
.cid:             
aamb:             j8Odv6LonN4r3an7LhD3WZrU1bUpAkFkkiY1ncBR96t2PTI
aamlh:            7
c.:               
a.:               
AppID:            HHonors 2024.10.1 (1)
CarrierName:      --
DeviceName:       iPhone14,4
OSVersion:        iOS 18.1
Resolution:       1125x2436
RunMode:          Application
TimeSinceLaunch:  24560
action:           digital key:key:unlock_btn
.a:               
hm.:              
app.:             
name:             HHonors iOS Mobile
.app:             
digitalkeyflag:   Yes
event.:           
element.:         
click:            digital key:key:unlock_btn
.element:         
key.:             
unlock.:          
initiate:         1
.unlock:          
.key:             
.event:           
flag.:            
appsettings:      N|N|NA|N|Y|Y|Y|Y|Y|NA|UsingApp|N|
orientation:      L
stay.:            
level.:           
status:           In-Stay
.level:           
.stay:            
timeCaptureAEP:   2024-10-14T09:59:44.676Z
timeCaptureEpoch: 1728899984
timeCaptureISO:   2024-10-14T05:59:44-0400
.flag:            
hotel.:           
brand:            HP
propertycode:     GCYPAHX
.hotel:           
key.:             
gnr:              79125065
locktype:         guest
lsn:              92044507
shared.:          
flag:             Yes
.shared:          
.key:             
page.:            
name:             
previous:         App:EN:Honors:Digital Key:Key
.page:            
purchase.:        
booking.:         
dates:            10132024:10142024:1
.booking:         
bookingid:        54486330
.purchase:        
site.:            
type:             PA
.site:            
user.:            
aam.:             
segments:         15218869,26458327,19493122,21537957,22516131,17952857,23583601,17952894,19484989,21539153,22889861,21539313,26458383,21881915,15217574
.aam:             
language:         en
login.:           
status:           Logged-in
.login:           
memberId:         2257829743
stayid:           2960880196
tierpoints:       Member
.user:            
.hm:              
.c:               
ce:               UTF-8
cp:               foreground
d.ptfm:           ios
mid:              61621496110939688115558742623055817571
pageName:         HHonors 2024.10.1 (1)
pe:               lnk_o
pev2:             AMACTION:digital key:key:unlock_btn
products:         ;GCYPAHX;;;;
t:                00/00/0000 00:00:00 0 240
ts:               1728899984
```

<br/>

> response 
```json 
 {
  "stuff":[ {
    "cn":"TMS","cv":"web=17836315,Web-app=15217574,Web-app=17952857,Web-app=17952894,web-app=19493122,web-app=19484989,web-app=21539153,web-app=21539313,web-app=21881915,web-app=22516131,web-app=22889861,web-app=23583601,web-app=15218869,web-app=26458327,web-app=26458383,web-app=21537957","ttl":30,"dmn":""
  }
  , {
    "cn":"fltk","cv":"segID=15218869","ttl":30,"dmn":""
  }
  ],"uuid":"61645808922583835885560882535048239660","dcs_region":7,"tid":"RufgJCfxTjg="
}
```

About a second afterward, I get a second request to `https://smetric.hilton.com/b/ss/hiltonglobalprod/10/IOSN030200030900/s88785229` with similar form data. Diff shown below.

> POST.diff
```diff
23c23
< action:           digital key:key:unlock_btn
---
> action:           digital key:key:unlock:unlock_success
31,33d30
< element.:
< click:            digital key:key:unlock_btn
< .element:
36c33
< initiate:         1
---
> success:          1
48,50c45,47
< timeCaptureAEP:   2024-10-14T09:59:44.676Z
< timeCaptureEpoch: 1728899984
< timeCaptureISO:   2024-10-14T05:59:44-0400
---
> timeCaptureAEP:   2024-10-14T09:59:45.537Z
> timeCaptureEpoch: 1728899985
> timeCaptureISO:   2024-10-14T05:59:45-0400
79c76
< segments:         15218869,26458327,19493122,21537957,22516131,17952857,23583601,17952894,19484989,21539153,22889861,21539313,26458383,21881915,15217574
---
> segments:         21537957,22889861,23583601,15218869,17952857,21881915,21539313,22516131,19484989,26458383,19493122,17952894,15217574,21539153,26458327
97c94
< pev2:             AMACTION:digital key:key:unlock_btn
---
> pev2:             AMACTION:digital key:key:unlock:unlock_success
100c97,99
< ts:               1728899984
---
> ts:               1728899985
>
> *:8080mitmproxy 10.4.2 
```
<br/>

> response.diff
```diff 
<   ],"uuid":"61645808922583835885560882535048239660","dcs_region":7,"tid":"RufgJCfxTjg="
---
>   ],"uuid":"61645808922583835885560882535048239660","dcs_region":7,"tid":"69dMPcWjQD4="
```

Replaying either of the requests does nothing except give a new `tid` value but doesn't unlock the door. The `sxxxxxxx` part of the request URL also changes on every new request and doesn't seem to match any discernible pattern. The `IOSN030200030900` part never changes, however. My guess is that that part is a hotel reference ID. From doing some ducking around online, I couldn't find any references to the `smetric.hilton.com` domain, but it was blocked by uBlock Origin as part of the [EasyPrivacy](https://easylist.to/#easyprivacy) block list. The app also seems to issue requests to this URL.

## Wrap up

{{ img(id="https://cloud-ryjlxhb9r-hack-club-bot.vercel.app/1bluetooth-scan.png" alt="screenshot of bluetooth scan" caption="The bluetooth scan of (what i believe is) the lift") }}

I tried running a Bluetooth scan to see if I could find the locks, but nothing popped out as being a likely culprit. I did however find an interesting set of 3 Bluetooth devices named "clearsky smart fleet" which upon research seems to be scissor lifts / construction equipment made by a company called [JLG](https://smartfleet.jlg.com/) which is quite interesting. That would make sense, however, as I saw several scissor lifts outside the hotel on my way in.  

{{ img(id="https://cloud-1asinv8kn-hack-club-bot.vercel.app/0img_2781.jpg" alt="image of JLG lift" caption="The same (probably) JLG lift in the wild!") }}

By the time I'm writing this it's 6:41, and I need to eat breakfast, so I'll probably finish this post in the car this afternoon. Overall this was a fascinating experiment and while I sadly did fail at unlocking doors from my laptop I do feel more confident with reverse engineering app requests now! The next step would probably be to grab the app bundle and try to decompile it looking for the URLs we saw, but I don't have a mac on me, and I've never done that before. Next post?

Taking inspiration from the [LOW←TECH MAGAZINE](https://solar.lowtechmagazine.com/) I will be taking any questions / comments about this article via email and then posting them here to my site! If you have a question or comment, feel free to email me at [me@dunkirk.sh](mailto://me@dunkirk.sh). Now to go eat breakfast :)

{{ img(id="https://cloud-1asinv8kn-hack-club-bot.vercel.app/3img_2777.jpg" alt="image of my hotel breakfast" caption="A delicious waffle, mildy warm bacon, and under seasoned potatoes.") }}
