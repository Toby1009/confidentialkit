use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_zk_sdk::encryption::derivation::derive_confidential_keys;

fn main() {
    let path = std::env::args().nth(1).expect("keypair path");
    let acct_b58 = std::env::args().nth(2).unwrap_or_default();
    let bytes: Vec<u8> = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    let kp = Keypair::try_from(&bytes[..]).expect("keypair");
    println!("OWNER_PUBKEY {}", kp.pubkey());

    let owner_pk = kp.pubkey().to_bytes().to_vec();
    let acct_pk = bs58::decode(&acct_b58).into_vec().unwrap_or_default();

    let candidates: Vec<(&str, Vec<u8>)> = vec![
        ("empty", vec![]),
        ("owner_pubkey", owner_pk),
        ("account_pubkey", acct_pk),
    ];

    for (label, seed) in candidates {
        if label == "account_pubkey" && seed.is_empty() {
            continue;
        }
        match derive_confidential_keys(&kp, &seed) {
            Ok((elgamal, ae)) => {
                let pk: [u8; 32] = elgamal.pubkey().into();
                let aeb: [u8; 16] = (&ae).into();
                println!(
                    "[{}] elgamal_pubkey={} ae_key={}",
                    label,
                    hex::encode(pk),
                    hex::encode(aeb)
                );
            }
            Err(e) => println!("[{}] error: {}", label, e),
        }
    }
}
