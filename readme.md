Ronak Jeweller Live Rates Website

FEATURE 1:-
confirm these rules - 

1. One mobile number can have only one active device. 

2. New OTP verification replaces the old device.

3. One device cannot login with multiple mobile numbers.

4. admin action buttons should include: Mobile Number, Name, Registered Device, Last Login Time, IP/City approx, Remove Device, Block/Unblock Number.


FEATURE 2:-
For volatility notification, trigger notification when Silver MCX Buy moves ₹550 within 40 seconds (our old logic), send notification once, and then pause notification for 10 minutes. Notification language should be the user's set language. Currently, there is also an issue with the volatility message. The admin panel shows 'volatility triggered' in the changelog, but in the website/app there is no message diplay of high volatility. please also fix this issue.


FEATURE 3:-
There should be a separate tab/page for target rate alert system. You can create a floating tab at the bottom that shows 'Live Rates' and 'My Alerts' as options for now. Alert condition should be as follows-

1. Send notification when MCX buy or MCX sell rate of Gold or Silver is below/equal to a set target 

2. Send notification when MCX buy or MCX sell rate of Gold or Silver is above/equal to a set target 

3. Remove the alert once the set target is reached.

3. Maximum 5 active alerts per user


FEATURE 4:-
For hindi language support, full app including rate names, disclaimers, login page, sidebar while keeping the placement and storage recommended by you. Do not add bullion calculator. Do not show  'Alerts' options in the sidebar.


FEATURE 5:-
Add a feedback button on the sidebar. After user logout, show 'logout successful' with login again button and a feedback textbox with submit button. All thr entered feedback should be sent us at to our email- rrmctexim@gmail.com

For the admin panel layout, create a different admin page and keep all the newly created sections on that same page. For the target alert section, allow the admin to view and remove the alert created by the user/users

Do not store allowed users in Firestore. We should keep allowed-users.json as the user whitelist.


FINAL WORDS:-
Just build everything at once but build it in this order. Take your time and build wisely.