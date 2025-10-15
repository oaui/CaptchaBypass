
Real Browser engine by t.me/cxmmand

For interactive captchas set .evn file to root path and place OPENAI_API in it with the corresponding API token

Setup fee $100

Message on telegram only.

##Setup the browser below

# Add Google’s signing key

wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -

# Add Chrome repo

sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'

# Install stable channel

sudo apt update
sudo apt install google-chrome-stable -y
