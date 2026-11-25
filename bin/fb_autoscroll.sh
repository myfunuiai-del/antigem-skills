#!/bin/sh
STOP_FILE="/data/user/0/ai.antigem/files/usr/tmp/stop_fb_scroll"
rm -f "$STOP_FILE"

echo "Launching Facebook..."
$HOME/.local/bin/shevery_shell.sh -c "am start -n com.facebook.katana/.LoginActivity || monkey -p com.facebook.katana -c android.intent.category.LAUNCHER 1"
sleep 2

echo "Auto-scrolling started. Create $STOP_FILE or kill this task to stop."

while true; do
  if [ -f "$STOP_FILE" ]; then
    echo "Stop signal received. Stopping scroll loop."
    rm -f "$STOP_FILE"
    break
  fi

  # Swipe up from y=2000 to y=600 over 400ms (screen is 1280x2772)
  $HOME/.local/bin/shevery_shell.sh -c "input swipe 640 2000 640 600 400"
  
  # Wait 3 seconds per post/video
  sleep 3
done
