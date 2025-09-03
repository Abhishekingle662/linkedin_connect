# First install the library if you don't have it:
# pip install tiktoken

import tiktoken

# choose tokenizer for a model (gpt-4 or gpt-3.5-turbo, depending on what produced the tokens)
enc = tiktoken.encoding_for_model("gpt-4")

tokens = [64659, 123310, 75584, 8138, 38271]

decoded = enc.decode(tokens)
print("Decoded text:", decoded)
