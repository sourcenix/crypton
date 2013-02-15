(function() {
  var Account = crypton.Account = function Account () {};

  Account.prototype.save = function (callback) {
    superagent.post(crypton.url() + '/account')
      .send(this.serialize())
      .end(function (res) {
        if (res.body.success !== true) {
          callback(res.body.error);
        } else {
          callback();
        }
      }
    );
  };

  Account.prototype.refresh = function () {
  };

  Account.prototype.unravel = function (callback) {
    var hp = CryptoJS.enc.Hex.parse;

    // reconstruct keypairKey from passphrase
    var saltKey = hp(this.saltKey);
    var keypairKey = CryptoJS.PBKDF2(this.passphrase, saltKey, {
      keySize: 256 / 32,
      // iterations: 1000
    });

    // decrypt keypair
    var keypairIv = hp(this.keypairIv);
    var encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: hp(this.keypairSerializedCiphertext),
      iv: keypairIv
    });
    var keypairSerialized = CryptoJS.AES.decrypt(
      encrypted, keypairKey, {
        iv: keypairIv,
        mode: CryptoJS.mode.CFB,
        padding: CryptoJS.pad.Pkcs7
      }
    ).toString(CryptoJS.enc.Utf8);

    // reconstruct keypair
    this.keypair = new RSAKey().fromString(keypairSerialized);

    // decrypt symkey
    var symkey = this.keypair.decrypt(this.symkeyCiphertext);
    this.symkey = hp(symkey);

    // decrypt containerNameHmacKey
    var containerNameHmacKeyIv = hp(this.containerNameHmacKeyIv);
    encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: hp(this.containerNameHmacKeyCiphertext),
      iv: containerNameHmacKeyIv
    });
    this.containerNameHmacKey = CryptoJS.AES.decrypt(
      encrypted, this.symkey, {
        iv: containerNameHmacKeyIv,
        mode: CryptoJS.mode.CFB,
        padding: CryptoJS.pad.NoPadding
      }
    );

    // decrypt hmacKey
    var hmacKeyIv = hp(this.hmacKeyIv);
    encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: hp(this.hmacKeyCiphertext),
      iv: hmacKeyIv
    });
    this.hmacKey = CryptoJS.AES.decrypt(
      encrypted, this.symkey, {
        iv: hmacKeyIv,
        mode: CryptoJS.mode.CFB,
        padding: CryptoJS.pad.NoPadding
      }
    );

    callback();
  };

  Account.prototype.serialize = function () {
    return {
      challengeKey: this.challengeKey,
      containerNameHmacKeyCiphertext: this.containerNameHmacKeyCiphertext,
      containerNameHmacKeyIv: this.containerNameHmacKeyIv,
      hmacKey: this.hmacKey,
      hmacKeyCiphertext: this.hmacKeyCiphertext,
      hmacKeyIv: this.hmacKeyIv,
      keypairIv: this.keypairIv,
      keypairSerializedCiphertext: this.keypairSerializedCiphertext,
      pubKey: this.pubKey,
      saltChallenge: this.saltChallenge,
      saltKey: this.saltKey,
      symkeyCiphertext: this.symkeyCiphertext,
      username: this.username
    };
  };
})();

